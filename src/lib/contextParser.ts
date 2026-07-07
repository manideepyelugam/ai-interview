import type { InterviewContext } from "@/src/types";

/**
 * Parses a mock Job Description from a PDF file.
 */
export async function parseJobDescription(file: File): Promise<InterviewContext> {
  const nameLower = file.name.toLowerCase();
  
  // Custom parsing profiles based on filename keywords
  if (nameLower.includes("mern") || nameLower.includes("react") || nameLower.includes("frontend")) {
    return {
      source: "jd",
      role: "MERN Stack Developer",
      jd: {
        company: "Vercel Inc.",
        experience: "1-3 Years",
        requiredSkills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js", "Express"],
        preferredSkills: ["GraphQL", "Docker", "AWS", "Appwrite"]
      }
    };
  }

  if (nameLower.includes("backend") || nameLower.includes("node") || nameLower.includes("python") || nameLower.includes("java")) {
    return {
      source: "jd",
      role: "Backend Engineer",
      jd: {
        company: "Linear App",
        experience: "2-5 Years",
        requiredSkills: ["Node.js", "Express.js", "PostgreSQL", "Redis", "TypeScript", "REST APIs"],
        preferredSkills: ["Docker", "Kubernetes", "AWS", "gRPC", "Microservices"]
      }
    };
  }

  // Fallback for Job Descriptions
  return {
    source: "jd",
    role: "Software Engineer",
    jd: {
      company: "Notion Labs",
      experience: "2+ Years",
      requiredSkills: ["JavaScript", "TypeScript", "React", "Node.js", "CSS Modules"],
      preferredSkills: ["System Design", "Cloud Infrastructure", "CI/CD Platforms"]
    }
  };
}

/**
 * Parses a mock Resume from a PDF file.
 */
export async function parseResume(file: File): Promise<InterviewContext> {
  const nameLower = file.name.toLowerCase();

  if (nameLower.includes("manideep") || nameLower.includes("yelugam")) {
    return {
      source: "resume",
      role: "MERN Stack Developer",
      resume: {
        name: "Manideep Yelugam",
        skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js", "Appwrite", "PostgreSQL", "Zod", "Appwrite Cloud"],
        projects: [
          "AI Interview Practice Platform (Next.js 15, Appwrite, Tailwind)",
          "Developer Portfolio Website",
          "E-commerce SaaS Platform"
        ],
        education: "Bachelor of Technology in Computer Science & Engineering"
      }
    };
  }

  if (nameLower.includes("john") || nameLower.includes("doe")) {
    return {
      source: "resume",
      role: "Full Stack Developer",
      resume: {
        name: "John Doe",
        skills: ["React", "Next.js", "MongoDB", "TypeScript", "Node.js", "Express", "Tailwind CSS", "Git"],
        projects: [
          "AI Interview Platform",
          "Interactive Portfolio Website",
          "Real-time Chat Application"
        ],
        education: "Bachelor of Science in Computer Science"
      }
    };
  }

  // Fallback for Resumes
  return {
    source: "resume",
    role: "Software Engineer",
    resume: {
      name: "Engineering Candidate",
      skills: ["React", "TypeScript", "Node.js", "Git", "REST APIs", "SQL", "HTML5 & CSS3"],
      projects: [
        "Task Management Dashboard",
        "Weather Forecast Application"
      ],
      education: "Bachelor of Science in Information Technology"
    }
  };
}
