import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import OpenAI from "openai"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlaseny" }, { status: 401 })
    }

    // Get user's OpenAI API key
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        openaiApiKey: true,
        openaiKeyIv: true,
      },
    })

    let openaiKey: string | null = null

    if (userData?.openaiApiKey && userData?.openaiKeyIv) {
      openaiKey = decrypt(userData.openaiApiKey, userData.openaiKeyIv)
    } else if (process.env.OPENAI_API_KEY) {
      openaiKey = process.env.OPENAI_API_KEY
    }

    if (!openaiKey) {
      return NextResponse.json(
        {
          error:
            "Pro hlasove poznamky je potreba OpenAI API klic. Pridejte ho v Nastaveni.",
        },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as Blob | null

    if (!audioFile) {
      return NextResponse.json(
        { error: "Zadny zvukovy soubor" },
        { status: 400 }
      )
    }

    // Max 25MB (Whisper limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Soubor je prilis velky (max 25 MB)" },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey: openaiKey })

    const file = new File([audioFile], "recording.webm", {
      type: audioFile.type || "audio/webm",
    })

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "cs",
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json(
      { error: "Chyba pri prepisu zvuku" },
      { status: 500 }
    )
  }
}
