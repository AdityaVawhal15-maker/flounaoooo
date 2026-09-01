export type FitLevel = "Exceptional Fit" | "Strong Match" | "High Alignment" | "Worth Exploring";

export type CareerPath = {
  id: string;
  slug: string;
  title: string;
  category: "Product" | "Engineering" | "Design" | "Strategy" | "Data & AI";
  fitScore: number;
  fitLevel: FitLevel;
  tagline: string;
  description: string;
  whyFit: string[];
  currentStrengths: string[];
  skillGaps: string[];
  typicalFirstSteps: string[];
  projectsToTry: {
    title: string;
    description: string;
    timeframe: string;
  }[];
  mentorIds: string[];
  learningPlanSlug?: string;
  salaryRange?: string;
  demandTrend?: string;
};

export type SkillProfile = {
  category: string;
  score: number; // 0 - 100
  level: "Foundational" | "Practitioner" | "Advanced" | "Mastery";
  subskills: { name: string; score: number }[];
  nextLever: {
    skill: string;
    reason: string;
    expectedImpact: string;
    actionableStep: string;
  };
};

export type Mentor = {
  id: string;
  name: string;
  role: string;
  company: string;
  matchScore: number;
  avatar: string;
  initials: string;
  bio: string;
  whyRecommended: string;
  experienceYears: number;
  domains: string[];
  availability: "Available this week" | "2 slots left" | "Next available Mon";
  featuredInsight?: string;
  rating?: number;
  sessionsCompleted?: number;
};

export type PlanTask = {
  id: string;
  title: string;
  completed: boolean;
  estimatedHours: number;
  resourceTitle?: string;
  resourceType?: "Article" | "Project" | "Framework" | "Discussion";
};

export type PlanWeek = {
  weekNumber: number;
  phase: "01 DISCOVER" | "02 LEARN" | "03 BUILD" | "04 CONNECT" | "05 APPLY" | "06 REFLECT";
  title: string;
  objective: string;
  tasks: PlanTask[];
  milestone: string;
};

export type LearningPlan = {
  id: string;
  pathSlug: string;
  pathTitle: string;
  targetGoal: string;
  durationDays: number;
  weeks: PlanWeek[];
  totalTasks: number;
  completedTasks: number;
};

export type JourneyProgress = {
  overallPercentage: number;
  activePathTitle: string;
  currentFocus: string;
  completedTasksCount: number;
  totalTasksCount: number;
  streakDays: number;
  recentActivity: {
    date: string;
    title: string;
    type: "task" | "mentor" | "path" | "skill";
  }[];
  proactiveInsights: string[];
  nextBestMove: {
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
  };
};

export type AIIntent =
  | "path_discovery"
  | "skill_analysis"
  | "mentor_match"
  | "learning_plan"
  | "progress_check"
  | "general_guidance";

export type AIResponse = {
  id: string;
  message: string;
  intent: AIIntent;
  thinkingSteps: string[];
  paths?: CareerPath[];
  skills?: SkillProfile[];
  mentors?: Mentor[];
  plan?: LearningPlan;
  progress?: JourneyProgress;
  suggestedActions: {
    label: string;
    prompt: string;
    actionType?: string;
  }[];
  timestamp: string;
};
