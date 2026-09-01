import {
  CAREER_PATHS,
  SKILL_PROFILES,
  MENTORS,
  DEFAULT_LEARNING_PLAN,
  DEFAULT_JOURNEY_PROGRESS,
} from "./knowledge";
import type {
  AIIntent,
  AIResponse,
  CareerPath,
  Mentor,
  SkillProfile,
  LearningPlan,
  JourneyProgress,
} from "./types";

type UserContext = {
  name?: string;
  currentPage?: string;
  activePath?: string;
  interests?: string[];
  skills?: string[];
};

export async function processUserMessage(
  message: string,
  context: UserContext = {}
): Promise<AIResponse> {
  const text = message.toLowerCase().trim();

  // Intent routing
  let intent: AIIntent = "general_guidance";
  let thinkingSteps: string[] = [];
  let responseText = "";
  let paths: CareerPath[] | undefined = undefined;
  let skills: SkillProfile[] | undefined = undefined;
  let mentors: Mentor[] | undefined = undefined;
  let plan: LearningPlan | undefined = undefined;
  let progress: JourneyProgress | undefined = undefined;
  let suggestedActions: { label: string; prompt: string; actionType?: string }[] = [];

  const userName = context.name || "Aditya";

  if (
    text.includes("path") ||
    text.includes("career") ||
    text.includes("direction") ||
    text.includes("role") ||
    text.includes("choose") ||
    text.includes("what should i do") ||
    text.includes("fit") ||
    text.includes("explore")
  ) {
    intent = "path_discovery";
    thinkingSteps = [
      "Understanding your goals and analytical background",
      "Connecting your experience in systems and product design",
      "Evaluating alignment across verified industry tracks",
      "Synthesizing customized fit breakdowns & first steps",
    ];
    responseText = `Based on your strengths in structured thinking, systems architecture, and product intuition, I've mapped 4 clear directions for you. Product Management and Product Design show the strongest immediate leverage.`;
    paths = CAREER_PATHS;
    suggestedActions = [
      { label: "Compare Product Management vs Design", prompt: "Compare Product Management and Product Design for me" },
      { label: "Build my 30-Day Plan", prompt: "Build my 30-day plan for Product Management" },
      { label: "Find mentors in Product", prompt: "Find mentors who can help me transition to Product Management" },
    ];
  } else if (
    text.includes("skill") ||
    text.includes("strength") ||
    text.includes("gap") ||
    text.includes("lever") ||
    text.includes("analyze") ||
    text.includes("learn")
  ) {
    intent = "skill_analysis";
    thinkingSteps = [
      "Analyzing your technical and strategic skill telemetry",
      "Benchmarking against top-quartile product & engineering roles",
      "Identifying highest-leverage growth unlock (Next Lever)",
      "Formulating concrete practice steps",
    ];
    responseText = `Here is your current skill distribution. Your Technical Architecture is in the top quartile (84%). Your single highest-impact unlock right now is **Product Analytics & Instrumentation**, which will make your product transitions 35% more defensible.`;
    skills = SKILL_PROFILES;
    suggestedActions = [
      { label: "Add Product Analytics to Plan", prompt: "Add Product Analytics to my 30-day learning plan" },
      { label: "Show mentors for Design & Motion", prompt: "Find mentors who specialize in Design Systems and Motion" },
      { label: "View my overall journey", prompt: "How is my progress looking this week?" },
    ];
  } else if (
    text.includes("mentor") ||
    text.includes("network") ||
    text.includes("advice") ||
    text.includes("talk to") ||
    text.includes("who can help") ||
    text.includes("interview") ||
    text.includes("expert")
  ) {
    intent = "mentor_match";
    thinkingSteps = [
      "Understanding your current career challenge",
      "Filtering FLOUNA Mentor Network for high-relevance domain experts",
      "Matching verified availability and past transition experience",
      "Preparing contextual conversation starters",
    ];
    responseText = `I've matched you with senior mentors from Stripe, Linear, and DeepMind. **Maya Sharma** (Staff PM @ Stripe) is your highest match (94% relevance) because she specializes in engineers stepping into product leadership.`;
    mentors = MENTORS;
    suggestedActions = [
      { label: "Connect with Maya Sharma", prompt: "How should I structure my 1:1 with Maya Sharma?" },
      { label: "Explore Design Mentors", prompt: "Show me mentors with deep experience in Design Systems" },
      { label: "Review my 30-Day Plan", prompt: "Show my current learning plan" },
    ];
  } else if (
    text.includes("plan") ||
    text.includes("roadmap") ||
    text.includes("30-day") ||
    text.includes("schedule") ||
    text.includes("week") ||
    text.includes("task")
  ) {
    intent = "learning_plan";
    thinkingSteps = [
      "Retrieving your active career objective",
      "Structuring 30-day milestone phases (Discover → Learn → Build → Connect → Apply → Reflect)",
      "Calibrating weekly task load for sustainable momentum",
      "Linking verified resources and mentor touchpoints",
    ];
    responseText = `Here is your structured 30-Day Foundation Plan. You are currently in **Week 4 (Phase 04: CONNECT)**. Your next immediate task is completing your PRD Case Study for mentor review.`;
    plan = DEFAULT_LEARNING_PLAN;
    suggestedActions = [
      { label: "Mark Task Complete", prompt: "I just finished the PRD case study formatting" },
      { label: "Book Mentor Critique", prompt: "Find mentors to review my PRD case study" },
      { label: "Check my skill profile", prompt: "Analyze my skills profile" },
    ];
  } else if (
    text.includes("progress") ||
    text.includes("journey") ||
    text.includes("streak") ||
    text.includes("status") ||
    text.includes("how am i doing") ||
    text.includes("track")
  ) {
    intent = "progress_check";
    thinkingSteps = [
      "Gathering weekly completed milestones and session data",
      "Calculating consistency metrics and streak health",
      "Detecting growth signals and momentum trends",
      "Formulating your next high-impact move",
    ];
    responseText = `You're making strong progress, ${userName}. You are **72% through your 30-day plan** with a 14-day momentum streak. You've completed 11 of 16 core milestones.`;
    progress = DEFAULT_JOURNEY_PROGRESS;
    suggestedActions = [
      { label: "What's my next best step?", prompt: "What is my next best move today?" },
      { label: "Explore career paths", prompt: "Help me choose a career path" },
      { label: "Find a mentor", prompt: "Find mentors for me" },
    ];
  } else {
    intent = "general_guidance";
    thinkingSteps = [
      "Synthesizing your inquiry with FLOUNA career intelligence",
      "Cross-referencing your active path and recent growth milestones",
      "Formulating personalized guidance",
    ];
    responseText = `Welcome back, ${userName}. I'm here to help you navigate your direction, master your next skill lever, connect with senior mentors, and execute on your personalized 30-day roadmap. Where should we focus today?`;
    suggestedActions = [
      { label: "Discover my path", prompt: "Help me choose a career path" },
      { label: "Analyze my skills", prompt: "Analyze my current skill profile" },
      { label: "Find relevant mentors", prompt: "Find mentors who can guide my next career move" },
      { label: "View my 30-day plan", prompt: "Show my 30-day learning plan" },
    ];
  }

  // Artificial slight delay simulation for UI realism if invoked client-side
  return {
    id: `flouna-ai-${Date.now()}`,
    message: responseText,
    intent,
    thinkingSteps,
    paths,
    skills,
    mentors,
    plan,
    progress,
    suggestedActions,
    timestamp: new Date().toISOString(),
  };
}
