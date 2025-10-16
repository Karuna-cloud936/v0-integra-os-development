export interface User {
  name: string
  role: "administrator" | "manager" | "shop_floor"
  passcode: string | null
}

export interface App {
  id: string
  name: string
  icon: string
  url?: string
  path?: string
  description: string
  roles: string[]
  type: "app" | "widget" | "local"
  modalId?: string
  hasGeminiFeature?: boolean
  isCustom?: boolean
}

export interface LayoutItem {
  id: string
  size: { col: number; row: number }
}

export interface Notice {
  id: string
  title: string
  url: string
  pinned: boolean
}

export interface TrainingDoc {
  id: string
  title: string
  url: string
}

export interface FormQuestion {
  id: number
  type: "text" | "checkbox" | "multiple-choice"
  label: string
  options?: string[]
}

export interface TrainingForm {
  id: string
  title: string
  completedBy: string[]
  questions: FormQuestion[]
}

export interface Employee {
  id: string
  name: string
  department: string
  position: string
  hireDate: string
  createdAt: number
}

export interface TrainingRecord {
  id: string
  employeeId: string
  trainingId: string
  trainingType: "document" | "form"
  completedDate: string
  expiryDate?: string
  score?: number
  notes?: string
}

export interface IntegraSyncedData {
  users: Record<string, User>
  config: {
    appLibraryTitle: string
    appLibrarySubtitle: string
    backgroundColor: string
    iconColor: string
    tileColor: string
    colorOptions: Array<{ name: string; class: string; theme: string }>
    iconColorOptions: Array<{ name: string; class: string }>
    tileColorOptions: Array<{ name: string; class: string }>
  }
  layouts: Record<string, LayoutItem[]>
  allAvailableApps: App[]
  announcements: string[]
  noticeBoardItems: Notice[]
  training: {
    documents: TrainingDoc[]
    forms: TrainingForm[]
    employees: Employee[]
    trainingRecords: TrainingRecord[]
  }
  lastModified?: number
  modifiedBy?: string
}

export interface IntegraState extends IntegraSyncedData {
  // Local UI state (not synced)
  currentUser: User | null
  editingLayoutForRole: string | null
  pendingRoleChange: string | null
}

export function getDefaultState(): IntegraState {
  const allApps: App[] = [
    {
      id: "inv_ctrl",
      name: "Inventory Control",
      icon: "fa-boxes-stacked",
      url: "#inventory",
      description: "Track materials and goods.",
      roles: ["administrator", "manager"],
      type: "app",
    },
    {
      id: "prod_analytics",
      name: "Production Analytics",
      icon: "fa-chart-line",
      url: "#analytics",
      description: "Visualize production metrics.",
      roles: ["administrator", "manager"],
      type: "app",
      hasGeminiFeature: true,
      modalId: "prod-details",
    },
    {
      id: "qa_main",
      name: "Quality Assurance",
      icon: "fa-clipboard-check",
      url: "#qa",
      description: "Log quality checks and reports.",
      roles: ["manager", "shop_floor"],
      type: "app",
    },
    {
      id: "job_movements",
      name: "Job Movements",
      icon: "fa-people-carry-box",
      url: "https://v0-job-movement-tracker.vercel.app/",
      description: "Track the movement of jobs and materials.",
      roles: ["manager", "shop_floor"],
      type: "app",
      modalId: "app",
    },
    {
      id: "job_tracking",
      name: "Fulcrum",
      icon: "fa-clipboard-list",
      url: "https://integrasystems.fulcrumpro.com/jobtracking/#/pinlogin",
      description: "Track and manage production jobs.",
      roles: ["administrator", "manager", "shop_floor"],
      type: "app",
      modalId: "app", // Changed from "training" to "app" so Fulcrum opens in iframe modal
    },
    {
      id: "ecr_system",
      name: "ECR System",
      icon: "fa-file-signature",
      url: "https://v0-engineer-change-request.vercel.app/",
      description: "Engineering Change Request system.",
      roles: ["administrator", "manager"],
      type: "app",
      modalId: "app",
    },
    {
      id: "training",
      name: "Employee Training",
      icon: "fa-chalkboard-teacher",
      url: "#training",
      description: "Access training modules.",
      roles: ["administrator", "manager", "shop_floor"],
      type: "app",
      modalId: "training",
    },
    {
      id: "purchasing",
      name: "Purchasing",
      icon: "fa-shopping-cart",
      url: "https://docs.google.com/spreadsheets/d/1PyNTDrVNwCzwHvLb2bR0oOlL6vD_ZljWa6bSa6-VpK0/edit?rm=minimal",
      description: "Create and track purchase orders.",
      roles: ["administrator", "manager"],
      type: "app",
      modalId: "app",
    },
    {
      id: "ofi_system",
      name: "OFI System",
      icon: "fa-lightbulb",
      url: "https://v0-form-enhancement-and-email.vercel.app/",
      description: "Opportunity for Improvement system.",
      roles: ["administrator", "manager", "shop_floor"],
      type: "app",
      modalId: "app",
    },
    {
      id: "communication",
      name: "Communication",
      icon: "fa-video",
      description: "Video calling and messaging between devices.",
      roles: ["administrator", "manager", "shop_floor"],
      type: "app",
      modalId: "communication",
    },
    {
      id: "weather_widget",
      name: "Weather",
      icon: "fa-cloud-sun",
      description: "Shows local weather forecast.",
      roles: ["administrator", "manager", "shop_floor"],
      type: "widget",
    },
    {
      id: "prod_widget",
      name: "Production Tracker",
      icon: "fa-chart-simple",
      description: "Live production line metrics.",
      roles: ["administrator", "manager"],
      type: "widget",
    },
    {
      id: "notice_widget",
      name: "Notice Board",
      icon: "fa-thumbtack",
      description: "Company announcements and notices.",
      roles: ["administrator", "manager", "shop_floor"],
      type: "widget",
    },
    {
      id: "machine_status_widget",
      name: "Machine Status",
      icon: "fa-robot",
      description: "Real-time operations from Fulcrum.",
      roles: ["administrator", "manager", "shop_floor"],
      type: "widget",
    },
    {
      id: "inventory_widget",
      name: "Inventory Levels",
      icon: "fa-boxes-stacked",
      description: "Real-time inventory from Fulcrum.",
      roles: ["administrator", "manager", "shop_floor"],
      type: "widget",
    },
  ]

  const generateDefaultLayout = (role: string): LayoutItem[] => {
    return allApps
      .filter((app) => app.roles.includes(role))
      .map((app) => ({
        id: app.id,
        size: app.type === "widget" ? { col: 2, row: 2 } : { col: 1, row: 1 },
      }))
  }

  return {
    currentUser: null,
    editingLayoutForRole: null,
    pendingRoleChange: null,
    users: {
      administrator: { name: "Administrator", role: "administrator", passcode: "1442" },
      manager: { name: "Shift Manager", role: "manager", passcode: "5589" },
      shop_floor: { name: "Shop Floor Operator", role: "shop_floor", passcode: null },
    },
    config: {
      appLibraryTitle: "Application Hub",
      appLibrarySubtitle: "Launch your assigned applications and web links.",
      backgroundColor: "bg-background",
      iconColor: "text-primary",
      tileColor: "bg-card",
      colorOptions: [
        { name: "Slate", class: "bg-slate-900", theme: "dark" },
        { name: "Gray", class: "bg-gray-900", theme: "dark" },
        { name: "Zinc", class: "bg-zinc-900", theme: "dark" },
        { name: "Stone", class: "bg-stone-900", theme: "dark" },
        { name: "Blue", class: "bg-blue-950", theme: "dark" },
        { name: "Indigo", class: "bg-indigo-950", theme: "dark" },
        { name: "Purple", class: "bg-purple-950", theme: "dark" },
        { name: "Green", class: "bg-green-950", theme: "dark" },
        { name: "Light Gray", class: "bg-slate-200", theme: "light" },
        { name: "White", class: "bg-white", theme: "light" },
      ],
      iconColorOptions: [
        { name: "White", class: "text-white" },
        { name: "Slate", class: "text-slate-400" },
        { name: "Sky", class: "text-sky-400" },
        { name: "Blue", class: "text-blue-400" },
        { name: "Indigo", class: "text-indigo-400" },
        { name: "Violet", class: "text-violet-400" },
        { name: "Purple", class: "text-purple-400" },
        { name: "Fuchsia", class: "text-fuchsia-400" },
        { name: "Pink", class: "text-pink-400" },
        { name: "Rose", class: "text-rose-400" },
        { name: "Red", class: "text-red-400" },
        { name: "Orange", class: "text-orange-400" },
        { name: "Amber", class: "text-amber-400" },
        { name: "Yellow", class: "text-yellow-400" },
        { name: "Lime", class: "text-lime-400" },
        { name: "Green", class: "text-green-400" },
        { name: "Emerald", class: "text-emerald-400" },
        { name: "Teal", class: "text-teal-400" },
        { name: "Cyan", class: "text-cyan-400" },
      ],
      tileColorOptions: [
        { name: "Slate", class: "bg-slate-800/80" },
        { name: "Gray", class: "bg-gray-800/80" },
        { name: "Blue", class: "bg-blue-800/50" },
        { name: "Green", class: "bg-green-800/50" },
        { name: "White", class: "bg-white/80" },
        { name: "Light Slate", class: "bg-slate-300/80" },
      ],
    },
    layouts: {
      administrator: generateDefaultLayout("administrator"),
      manager: generateDefaultLayout("manager"),
      shop_floor: generateDefaultLayout("shop_floor"),
    },
    allAvailableApps: allApps,
    announcements: ["Welcome to Integra Systems OS!", "Q3 Safety review meeting is scheduled for next Friday."],
    noticeBoardItems: [
      {
        id: "notice_1678886400000",
        title: "Safety Protocol Update",
        url: "https://www.afscme.org/news/publications/workplace-health-and-safety/fact-sheets/afscme-fact-sheet-preventing-workplace-injury-and-illness.pdf",
        pinned: true,
      },
      {
        id: "notice_1678886400001",
        title: "Q4 Production Goals",
        url: "https://www.in-pro.com/images/pdfs/unleashing-your-production-potential-through-lean-manufacturing.pdf",
        pinned: true,
      },
    ],
    training: {
      documents: [
        {
          id: `doc_${Date.now()}`,
          title: "Forklift Operation Manual",
          url: "https://www.osha.gov/sites/default/files/publications/osha2220.pdf",
        },
      ],
      forms: [
        {
          id: `form_${Date.now()}`,
          title: "Site Induction Checklist",
          completedBy: [],
          questions: [
            { id: 1, type: "text", label: "Full Name" },
            { id: 2, type: "checkbox", label: "I have received and read the safety manual." },
            {
              id: 3,
              type: "multiple-choice",
              label: "What is the primary emergency exit?",
              options: ["North Door", "South Door", "West Roller Door"],
            },
          ],
        },
      ],
      employees: [
        {
          id: "emp_1",
          name: "John Doe",
          department: "Production",
          position: "Operator",
          hireDate: "2022-01-15",
          createdAt: Date.now(),
        },
        {
          id: "emp_2",
          name: "Jane Smith",
          department: "Quality",
          position: "Inspector",
          hireDate: "2021-05-20",
          createdAt: Date.now(),
        },
      ],
      trainingRecords: [
        {
          id: `rec_${Date.now()}`,
          employeeId: "emp_1",
          trainingId: `doc_${Date.now()}`,
          trainingType: "document",
          completedDate: "2023-03-01",
          expiryDate: "2024-03-01",
          score: 85,
          notes: "Needs improvement in certain sections.",
        },
        {
          id: `rec_${Date.now()}`,
          employeeId: "emp_2",
          trainingId: `form_${Date.now()}`,
          trainingType: "form",
          completedDate: "2023-03-02",
          score: 90,
        },
      ],
    },
    lastModified: Date.now(),
    modifiedBy: "system",
  }
}
