import express from "express";
import User from "../models/User.js";

const router = express.Router();

const assessments = [
  {
    id: 1,
    title: "Beck Depression Inventory (BDI)",
    slug: "bdi",
    description: "A self-assessment to measure levels of depression.",
    category: "mental",
    questions: [
      {
        id: "q1",
        text: "Sadness",
        options: [
          "I do not feel sad.",
          "I feel sad.",
          "I am sad all the time and I can't snap out of it.",
          "I am so sad and unhappy that I can't stand it."
        ],
        optionsWithWeights: {
          "I do not feel sad.": 0,
          "I feel sad.": 1,
          "I am sad all the time and I can't snap out of it.": 2,
          "I am so sad and unhappy that I can't stand it.": 3
        }
      },
      {
        id: "q2",
        text: "Pessimism / Discouragement about the future",
        options: [
          "I am not particularly discouraged about the future.",
          "I feel discouraged about the future.",
          "I feel I have nothing to look forward to.",
          "I feel the future is hopeless and that things cannot improve."
        ],
        optionsWithWeights: {
          "I am not particularly discouraged about the future.": 0,
          "I feel discouraged about the future.": 1,
          "I feel I have nothing to look forward to.": 2,
          "I feel the future is hopeless and that things cannot improve.": 3
        }
      },
      {
        id: "q3",
        text: "Sense of Failure",
        options: [
          "I do not feel like a failure.",
          "I feel I have failed more than the average person.",
          "As I look back on my life, all I can see is a lot of failures.",
          "I feel I am a complete failure as a person."
        ],
        optionsWithWeights: {
          "I do not feel like a failure.": 0,
          "I feel I have failed more than the average person.": 1,
          "As I look back on my life, all I can see is a lot of failures.": 2,
          "I feel I am a complete failure as a person.": 3
        }
      },
      {
        id: "q4",
        text: "Loss of Pleasure",
        options: [
          "I get as much satisfaction out of things as I used to.",
          "I don't enjoy things the way I used to.",
          "I don't get real satisfaction out of anything anymore.",
          "I am dissatisfied or bored with everything."
        ],
        optionsWithWeights: {
          "I get as much satisfaction out of things as I used to.": 0,
          "I don't enjoy things the way I used to.": 1,
          "I don't get real satisfaction out of anything anymore.": 2,
          "I am dissatisfied or bored with everything.": 3
        }
      },
      {
        id: "q5",
        text: "Guilty Feelings",
        options: [
          "I don't feel particularly guilty.",
          "I feel guilty a good part of the time.",
          "I feel quite guilty most of the time.",
          "I feel guilty all of the time."
        ],
        optionsWithWeights: {
          "I don't feel particularly guilty.": 0,
          "I feel guilty a good part of the time.": 1,
          "I feel quite guilty most of the time.": 2,
          "I feel guilty all of the time.": 3
        }
      },
      {
        id: "q6",
        text: "Punishment Feelings",
        options: [
          "I don't feel I am being punished.",
          "I feel I may be punished.",
          "I expect to be punished.",
          "I feel I am being punished."
        ],
        optionsWithWeights: {
          "I don't feel I am being punished.": 0,
          "I feel I may be punished.": 1,
          "I expect to be punished.": 2,
          "I feel I am being punished.": 3
        }
      },
      {
        id: "q7",
        text: "Self-dislike / Disappointment",
        options: [
          "I don't feel disappointed in myself.",
          "I am disappointed in myself.",
          "I am disgusted with myself.",
          "I hate myself."
        ],
        optionsWithWeights: {
          "I don't feel disappointed in myself.": 0,
          "I am disappointed in myself.": 1,
          "I am disgusted with myself.": 2,
          "I hate myself.": 3
        }
      },
      {
        id: "q8",
        text: "Self-criticalness / Blaming",
        options: [
          "I don't feel I am any worse than anybody else.",
          "I am critical of myself for my weaknesses or mistakes.",
          "I blame myself all the time for my faults.",
          "I blame myself for everything bad that happens."
        ],
        optionsWithWeights: {
          "I don't feel I am any worse than anybody else.": 0,
          "I am critical of myself for my weaknesses or mistakes.": 1,
          "I blame myself all the time for my faults.": 2,
          "I blame myself for everything bad that happens.": 3
        }
      },
      {
        id: "q9",
        text: "Suicidal Thoughts or Wishes",
        options: [
          "I don't have any thoughts of killing myself.",
          "I have thoughts of killing myself, but I would not carry them out.",
          "I would like to kill myself.",
          "I would kill myself if I had the chance."
        ],
        optionsWithWeights: {
          "I don't have any thoughts of killing myself.": 0,
          "I have thoughts of killing myself, but I would not carry them out.": 1,
          "I would like to kill myself.": 2,
          "I would kill myself if I had the chance.": 3
        }
      },
      {
        id: "q10",
        text: "Crying",
        options: [
          "I don't cry any more than usual.",
          "I cry more now than I used to.",
          "I cry all the time now.",
          "I used to be able to cry, but now I can't cry even though I want to."
        ],
        optionsWithWeights: {
          "I don't cry any more than usual.": 0,
          "I cry more now than I used to.": 1,
          "I cry all the time now.": 2,
          "I used to be able to cry, but now I can't cry even though I want to.": 3
        }
      },
      {
        id: "q11",
        text: "Agitation / Irritability",
        options: [
          "I am no more irritated by things than I ever was.",
          "I am slightly more irritated now than usual.",
          "I am quite annoyed or irritated a good deal of the time.",
          "I feel irritated all the time."
        ],
        optionsWithWeights: {
          "I am no more irritated by things than I ever was.": 0,
          "I am slightly more irritated now than usual.": 1,
          "I am quite annoyed or irritated a good deal of the time.": 2,
          "I feel irritated all the time.": 3
        }
      },
      {
        id: "q12",
        text: "Loss of Interest",
        options: [
          "I have not lost interest in other people.",
          "I am less interested in other people than I used to be.",
          "I have lost most of my interest in other people.",
          "I have lost all of my interest in other people."
        ],
        optionsWithWeights: {
          "I have not lost interest in other people.": 0,
          "I am less interested in other people than I used to be.": 1,
          "I have lost most of my interest in other people.": 2,
          "I have lost all of my interest in other people.": 3
        }
      },
      {
        id: "q13",
        text: "Indecisiveness",
        options: [
          "I make decisions about as well as I ever could.",
          "I put off making decisions more than I used to.",
          "I have greater difficulty in making decisions more than I used to.",
          "I can't make decisions at all anymore."
        ],
        optionsWithWeights: {
          "I make decisions about as well as I ever could.": 0,
          "I put off making decisions more than I used to.": 1,
          "I have greater difficulty in making decisions more than I used to.": 2,
          "I can't make decisions at all anymore.": 3
        }
      },
      {
        id: "q14",
        text: "Worthlessness about appearance",
        options: [
          "I don't feel that I look any worse than I used to.",
          "I am worried that I am looking old or unattractive.",
          "I feel there are permanent changes in my appearance that make me look unattractive.",
          "I believe that I look ugly."
        ],
        optionsWithWeights: {
          "I don't feel that I look any worse than I used to.": 0,
          "I am worried that I am looking old or unattractive.": 1,
          "I feel there are permanent changes in my appearance that make me look unattractive.": 2,
          "I believe that I look ugly.": 3
        }
      },
      {
        id: "q15",
        text: "Work Difficulty",
        options: [
          "I can work about as well as before.",
          "It takes an extra effort to get started at doing something.",
          "I have to push myself very hard to do anything.",
          "I can't do any work at all."
        ],
        optionsWithWeights: {
          "I can work about as well as before.": 0,
          "It takes an extra effort to get started at doing something.": 1,
          "I have to push myself very hard to do anything.": 2,
          "I can't do any work at all.": 3
        }
      },
      {
        id: "q16",
        text: "Sleep Disturbance",
        options: [
          "I can sleep as well as usual.",
          "I don't sleep as well as I used to.",
          "I wake up 1–2 hours earlier than usual and find it hard to get back to sleep.",
          "I wake up several hours earlier than I used to and cannot get back to sleep."
        ],
        optionsWithWeights: {
          "I can sleep as well as usual.": 0,
          "I don't sleep as well as I used to.": 1,
          "I wake up 1–2 hours earlier than usual and find it hard to get back to sleep.": 2,
          "I wake up several hours earlier than I used to and cannot get back to sleep.": 3
        }
      },
      {
        id: "q17",
        text: "Fatigue",
        options: [
          "I don't get more tired than usual.",
          "I get tired more easily than I used to.",
          "I get tired from doing almost anything.",
          "I am too tired to do anything."
        ],
        optionsWithWeights: {
          "I don't get more tired than usual.": 0,
          "I get tired more easily than I used to.": 1,
          "I get tired from doing almost anything.": 2,
          "I am too tired to do anything.": 3
        }
      },
      {
        id: "q18",
        text: "Appetite",
        options: [
          "My appetite is no worse than usual.",
          "My appetite is not as good as it used to be.",
          "My appetite is much worse now.",
          "I have no appetite at all anymore."
        ],
        optionsWithWeights: {
          "My appetite is no worse than usual.": 0,
          "My appetite is not as good as it used to be.": 1,
          "My appetite is much worse now.": 2,
          "I have no appetite at all anymore.": 3
        }
      },
      {
        id: "q19",
        text: "Weight Loss",
        options: [
          "I haven't lost much weight, if any, lately.",
          "I have lost more than five pounds.",
          "I have lost more than ten pounds.",
          "I have lost more than fifteen pounds."
        ],
        optionsWithWeights: {
          "I haven't lost much weight, if any, lately.": 0,
          "I have lost more than five pounds.": 1,
          "I have lost more than ten pounds.": 2,
          "I have lost more than fifteen pounds.": 3
        }
      },
      {
        id: "q20",
        text: "Health Worries",
        options: [
          "I am no more worried about my health than usual.",
          "I am worried about physical problems like aches, pains, upset stomach, or constipation.",
          "I am very worried about physical problems and it's hard to think of much else.",
          "I am so worried about my physical problems that I cannot think of anything else."
        ],
        optionsWithWeights: {
          "I am no more worried about my health than usual.": 0,
          "I am worried about physical problems like aches, pains, upset stomach, or constipation.": 1,
          "I am very worried about physical problems and it's hard to think of much else.": 2,
          "I am so worried about my physical problems that I cannot think of anything else.": 3
        }
      },
      {
        id: "q21",
        text: "Loss of Interest in Sex",
        options: [
          "I have not noticed any recent change in my interest in sex.",
          "I am less interested in sex than I used to be.",
          "I have almost no interest in sex.",
          "I have lost interest in sex completely."
        ],
        optionsWithWeights: {
          "I have not noticed any recent change in my interest in sex.": 0,
          "I am less interested in sex than I used to be.": 1,
          "I have almost no interest in sex.": 2,
          "I have lost interest in sex completely.": 3
        }
      }
    ],
    scoring: (score) => {
      // Interpretation as per BDI scoring table from the PDF
      if (score <= 10) return { status: "Normal", message: "These ups and downs are considered normal." };
      if (score <= 16) return { status: "Mild Mood Disturbance", message: "Mild mood disturbance." };
      if (score <= 20) return { status: "Borderline Clinical Depression", message: "Borderline clinical depression." };
      if (score <= 30) return { status: "Moderate Depression", message: "Moderate depression." };
      if (score <= 40) return { status: "Severe Depression", message: "Severe depression." };
      return { status: "Extreme Depression", message: "Extreme depression — please seek professional help." };
    },
    maxScore: 63
  },
  {
    id: 2,
    title: "GAD-7 Anxiety Assessment",
    slug: "gad7",
    description: "A 7-question screening tool to measure anxiety levels.",
    category: "mental",
    questions: [
      {
        id: "q1",
        text: "Feeling nervous, anxious, or on edge",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q2",
        text: "Not being able to stop or control worrying",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q3",
        text: "Worrying too much about different things",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q4",
        text: "Trouble relaxing",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q5",
        text: "Being so restless that it is hard to sit still",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q6",
        text: "Becoming easily annoyed or irritable",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q7",
        text: "Feeling afraid as if something awful might happen",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      }
    ],
    scoring: (score) => {
      // Interpretation as per GAD-7 scoring from the PDF
      if (score <= 4) return { status: "Minimal Anxiety", message: "Minimal anxiety." };
      if (score <= 9) return { status: "Mild Anxiety", message: "Mild anxiety." };
      if (score <= 14) return { status: "Moderate Anxiety", message: "Moderate anxiety." };
      return { status: "Severe Anxiety", message: "Severe anxiety — consider professional consultation." };
    },
    maxScore: 21
  },

];

// Routes
router.get("/", (req, res) => {
  res.json(
    assessments.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      description: a.description,
      category: a.category,
      itemCount: a.questions.length
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
  let unanswered = [];

  assessment.questions.forEach((q) => {
    const givenAnswer = answers?.[q.id];
    if (givenAnswer == null) {
      unanswered.push(q.id);
      return;
    }
    const weight = q.optionsWithWeights?.[givenAnswer];
    totalScore += typeof weight === "number" ? weight : 0;
  });

  const { status, message } = assessment.scoring(totalScore);
  const percentage = Math.round((totalScore / assessment.maxScore) * 100);

  res.json({
    score: totalScore,
    maxScore: assessment.maxScore,
    percentage,
    report: `${totalScore} / ${assessment.maxScore}`,
    status,
    message,
    unanswered
  });
});

// Assign assessment to a student (always unlocked)
router.post("/assign/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { assessmentSlug } = req.body;

    // Find the student
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    // Find the assessment
    const assessment = assessments.find((a) => a.slug === assessmentSlug);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // Check if already assigned by assessmentId
    const already = student.assessments?.find((a) => a.assessmentId === assessment.id);
    if (already) {
      return res.status(400).json({ error: "Assessment already assigned" });
    }

    // ✅ Assign as unlocked by default (forever)
    if (!student.assessments) student.assessments = [];
    student.assessments.push({ assessmentId: assessment.id, status: "unlocked" });
    await student.save();

    res.json({ message: "Assessment assigned successfully", assessments: student.assessments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// (Optional) Unlock route → now redundant, but kept for compatibility
router.put("/unlock/:studentId/:assessmentId", async (req, res) => {
  try {
    const { studentId, assessmentId } = req.params;

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    const assessment = student.assessments.find(
      (a) => a.assessmentId === parseInt(assessmentId)
    );

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not assigned to this student" });
    }

    // ✅ Already always unlocked, so just return success
    assessment.status = "unlocked";
    await student.save();

    res.json({ message: "Assessment is already unlocked", assessments: student.assessments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get assigned assessments of a student
router.get("/my/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Enrich response with meta data
    const detailed = (student.assessments || []).map((a) => {
      const meta = assessments.find((m) => m.id === a.assessmentId);
      return {
        assessmentId: a.assessmentId,
        status: a.status,
        assignedAt: a.assignedAt,
        title: meta?.title,
        slug: meta?.slug,
        description: meta?.description
      };
    });

    res.json(detailed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



export default router;
