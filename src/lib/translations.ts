export const translations = {
  cs: {
    // Navigation
    dashboard: "Nástěnka",
    ideas: "Myšlenky",
    notes: "Poznámky",
    settings: "Nastavení",
    logout: "Odhlásit se",
    recent: "Nedávné",
    
    // Dashboard / General UI
    welcome: "Ahoj",
    brainDump: "Brain Dump",
    focusSession: "Focus Relace",
    doneToday: "Hotovo dnes",
    whatToWorkOn: "Co mám dělat?",
    streak: "Streak",
    staleIdeas: "Zapomenuté nápady",
    attentionNeeded: "Chce pozornost",
    
    // Notes
    syncKeep: "Synchronizovat Keep",
    syncing: "Synchronizuji...",
    addNote: "Rychlé přidání",
    searchPlaceholder: "Hledat poznámky a nápady...",
    processAll: "Zpracovat vše",
    noteDetail: "Detail poznámky",
    reprocess: "Přepracovat",
    delete: "Smazat",
    
    // Ideas
    ideaDetail: "Detail myšlenky",
    nextSteps: "Další kroky",
    relations: "Vztahy",
    mindMap: "Myšlenková mapa",
    kanban: "Kanban",
    list: "Seznam",
    noIdeas: "Žádné nápady nebyly nalezeny.",
    potentialHigh: "Vysoký",
    potentialMedium: "Střední",
    potentialLow: "Nízký",
    
    // Settings
    accountSettings: "Správa účtu",
    aiSettings: "AI Zpracování",
    googleKeepSettings: "Google Keep propojení",
    billingSettings: "Předplatné & Tarify",
    language: "Jazyk / Language",
    save: "Uložit",
    saved: "Uloženo",
    theme: "Vzhled",
    themeLight: "Světlý",
    themeDark: "Tmavý",
    themeSystem: "Systémový",
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    ideas: "Ideas",
    notes: "Notes",
    settings: "Settings",
    logout: "Log Out",
    recent: "Recent",
    
    // Dashboard / General UI
    welcome: "Hello",
    brainDump: "Brain Dump",
    focusSession: "Focus Session",
    doneToday: "Done Today",
    whatToWorkOn: "What should I do?",
    streak: "Streak",
    staleIdeas: "Forgotten Ideas",
    attentionNeeded: "Needs Attention",
    
    // Notes
    syncKeep: "Sync Keep",
    syncing: "Syncing...",
    addNote: "Quick Capture",
    searchPlaceholder: "Search notes and ideas...",
    processAll: "Process All",
    noteDetail: "Note Detail",
    reprocess: "Reprocess",
    delete: "Delete",
    
    // Ideas
    ideaDetail: "Idea Detail",
    nextSteps: "Next Steps",
    relations: "Relations",
    mindMap: "Mind Map",
    kanban: "Kanban",
    list: "List",
    noIdeas: "No ideas found.",
    potentialHigh: "High",
    potentialMedium: "Medium",
    potentialLow: "Low",
    
    // Settings
    accountSettings: "Account Settings",
    aiSettings: "AI Processing",
    googleKeepSettings: "Google Keep Integration",
    billingSettings: "Subscription & Billing",
    language: "Language",
    save: "Save",
    saved: "Saved",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
  }
}

export type Language = "cs" | "en"
export type TranslationKey = keyof typeof translations.en
