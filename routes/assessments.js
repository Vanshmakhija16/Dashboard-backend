import express from "express";
const router = express.Router();

const assessments = [
  {
    id: 1,
    title: "Depression Test",
    slug: "depression",
    description: "Understand your mood and mental well-being.",
    category: "mental",
    questions: [
      {
        id: "q1",
        text: "I feel sad most of the day",
        options: ["Never", "Sometimes", "Often", "Always"],
        optionsWithWeights: { Never: 3, Sometimes: 2, Often: 1, Always: 0 },
      },
      {
        id: "q2",
        text: "I enjoy activities I used to enjoy",
        options: ["Yes", "No"],
        optionsWithWeights: { Yes: 3, No: 0 },
      },
      {
        id: "q3",
        text: "I have trouble sleeping",
        options: ["Never", "Sometimes", "Often", "Always"],
        optionsWithWeights: { Never: 3, Sometimes: 2, Often: 1, Always: 0 },
      },
    ],
  },
  {
    id: 2,
    title: "Relationship Satisfaction",
    slug: "relationship",
    description: "Evaluate relationship satisfaction and communication.",
    category: "social",
    questions: [
      {
        id: "q1",
        text: "We communicate openly about feelings",
        options: ["Never", "Sometimes", "Often", "Always"],
        optionsWithWeights: { Never: 0, Sometimes: 1, Often: 2, Always: 3 },
      },
      {
        id: "q2",
        text: "I feel supported by my partner",
        options: ["Yes", "No"],
        optionsWithWeights: { Yes: 3, No: 0 },
      },
    ],
  },
  {
    id: 3,
    title: "Anxiety Assessment",
    slug: "anxiety",
    description: "Measure your anxiety symptoms and coping strategies.",
    category: "mental",
    questions: [
      {
        id: "q1",
        text: "I feel restless or keyed up",
        options: ["Never", "Sometimes", "Often", "Always"],
        optionsWithWeights: { Never: 3, Sometimes: 2, Often: 1, Always: 0 },
      },
      {
        id: "q2",
        text: "I worry about many things",
        options: ["Never", "Sometimes", "Often", "Always"],
        optionsWithWeights: { Never: 3, Sometimes: 2, Often: 1, Always: 0 },
      },
      {
        id: "q3",
        text: "I have trouble concentrating due to anxiety",
        options: ["Never", "Sometimes", "Often", "Always"],
        optionsWithWeights: { Never: 3, Sometimes: 2, Often: 1, Always: 0 },
      },
    ],
  },
  {
    id: 4,
    title: "Self-Esteem Quiz",
    slug: "self-esteem",
    description: "Discover your self-confidence levels and ways to boost them.",
    category: "psychological",
    questions: [
      {
        id: "q1",
        text: "I feel confident in my abilities",
        options: ["Strongly disagree", "Disagree", "Agree", "Strongly agree"],
        optionsWithWeights: { "Strongly disagree": 0, Disagree: 1, Agree: 2, "Strongly agree": 3 },
      },
      {
        id: "q2",
        text: "I accept myself as I am",
        options: ["Strongly disagree", "Disagree", "Agree", "Strongly agree"],
        optionsWithWeights: { "Strongly disagree": 0, Disagree: 1, Agree: 2, "Strongly agree": 3 },
      },
      {
        id: "q3",
        text: "I avoid comparing myself to others",
        options: ["Strongly disagree", "Disagree", "Agree", "Strongly agree"],
        optionsWithWeights: { "Strongly disagree": 0, Disagree: 1, Agree: 2, "Strongly agree": 3 },
      },
    ],
  },
  {
    id: 5,
    title: "Stress Level Test",
    slug: "stress-level",
    description: "Evaluate how stress affects your daily life and health.",
    category: "mental",
    questions: [
      {
        id: "q1",
        text: "I feel overwhelmed by responsibilities",
        options: ["Never", "Sometimes", "Often", "Always"],
        optionsWithWeights: { Never: 3, Sometimes: 2, Often: 1, Always: 0 },
      },
      {
        id: "q2",
        text: "I have trouble sleeping due to stress",
        options: ["Never", "Sometimes", "Often", "Always"],
        optionsWithWeights: { Never: 3, Sometimes: 2, Often: 1, Always: 0 },
      },
      {
        id: "q3",
        text: "I find relaxation difficult",
        options: ["Never", "Sometimes", "Often", "Always"],
        optionsWithWeights: { Never: 3, Sometimes: 2, Often: 1, Always: 0 },
      },
    ],
  },
];

router.get("/", (req, res) => {
  res.json(
    assessments.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      description: a.description,
      category: a.category,
      itemCount: a.questions.length,
    }))
  );
});

router.get("/:slug", (req, res) => {
  const assessment = assessments.find((a) => a.slug === req.params.slug);
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });
  res.json(assessment);
});

router.post("/:slug/submit", (req, res) => {
  const assessment = assessments.find((a) => a.slug === req.params.slug);
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });

  const { answers } = req.body || {};
  let totalScore = 0;
  let maxScore = 0;

  assessment.questions.forEach((q) => {
    const givenAnswer = answers?.[q.id];
    if (q.optionsWithWeights) {
      const optionScore = q.optionsWithWeights[givenAnswer] ?? 0;
      totalScore += optionScore;
      const maxOptionScore = Math.max(...Object.values(q.optionsWithWeights));
      maxScore += maxOptionScore;
    }
  });

  const percentage = maxScore === 0 ? 0 : Math.round((totalScore / maxScore) * 100);

  let status = "Unknown";
  let message = "Thank you for completing the assessment.";

  // Detailed scoring and messaging per test slug
  switch (assessment.slug) {
    case "depression":
      if (percentage >= 80) {
        status = "Low risk";
        message = "You show good mental peace. Keep nurturing your well-being!";
      } else if (percentage >= 50) {
        status = "Moderate risk";
        message = "Some symptoms of depression noted. Consider self-care or consulting a professional.";
      } else {
        status = "High risk";
        message = "Signs of depression detected. It is advisable to seek help from a mental health professional.";
      }
      break;

    case "relationship":
      if (percentage >= 80) {
        status = "Healthy Relationship";
        message = "Your relationship communication and support seem strong.";
      } else if (percentage >= 50) {
        status = "Some Concerns";
        message = "There are some areas to improve. Communication is key.";
      } else {
        status = "High Concern";
        message = "Significant issues detected. Consider relationship counseling.";
      }
      break;

    case "anxiety":
      if (percentage >= 80) {
        status = "Low Anxiety";
        message = "Your anxiety symptoms appear minimal. Keep taking care of yourself!";
      } else if (percentage >= 50) {
        status = "Moderate Anxiety";
        message = "You might be experiencing moderate anxiety. Consider relaxation techniques.";
      } else {
        status = "High Anxiety";
        message = "High anxiety signs detected. Please consider seeking professional guidance.";
      }
      break;

    case "self-esteem":
      if (percentage >= 80) {
        status = "High Self-Esteem";
        message = "You demonstrate healthy confidence and self-acceptance.";
      } else if (percentage >= 50) {
        status = "Moderate Self-Esteem";
        message = "Your self-esteem could be improved. Try positive affirmations.";
      } else {
        status = "Low Self-Esteem";
        message = "Signs of low self-esteem detected. Consider working with a counselor or therapist.";
      }
      break;

    case "stress-level":
      if (percentage >= 80) {
        status = "Low Stress";
        message = "You seem to handle stress well. Keep up your good habits!";
      } else if (percentage >= 50) {
        status = "Moderate Stress";
        message = "You experience some stress. Practice coping techniques and self-care.";
      } else {
        status = "High Stress";
        message = "High levels of stress detected. Consider professional support.";
      }
      break;

    default:
      status = "Result calculated";
      message = `Your score is ${percentage}%. Thank you for participating.`;
  }

  res.json({
    score: totalScore,
    maxScore,
    percentage,
    status,
    message,
  });
});

export default router;
