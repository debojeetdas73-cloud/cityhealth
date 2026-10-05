import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* =========================================================
   INPUT
========================================================= */

const schema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),

  message: z
    .string()
    .min(1)
    .max(4000),

  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .default([]),

  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

/* =========================================================
   SYSTEM PROMPT
========================================================= */

const SYSTEM_PROMPT = `
You are cityhealth, an AI healthcare assistant for an Indian healthcare discovery platform.

Your job is to understand the user's question in normal everyday language and provide a useful answer.

RULES:

1. Understand everyday language.

Examples:

"My head is hurting" = headache
"My head is paining" = headache
"My head hurts every morning" = headache
"My leg is paining" = leg pain
"My stomach burns after eating" = digestive/reflux concern
"My skin is breaking out" = skin concern
"My teeth hurt" = dental concern

2. The user does not need medical terminology.

3. Never diagnose a disease.

4. Never prescribe medicines or dosages.

5. Never invent doctors, hospitals, ratings, fees, reviews or availability.

6. If the user asks which doctor they should see, identify the relevant specialty.

7. If the user asks about hospitals, classify it as a hospital request.

8. If the user asks for the best doctor or hospital, understand "best" as the best available match according to the cityhealth database ranking.

9. Do not ask clarification when the question is already understandable.

10. Ask clarification only when the question is genuinely too vague.

11. General medical questions should receive a direct educational answer.

Examples:

"What is migraine?" = general_health
"What causes migraine?" = general_health
"What is acne?" = general_health
"What causes fever?" = general_health

12. Questions about doctors:

"Which doctor is best for headaches?" = doctor_search
"Which doctor should I see for leg pain?" = doctor_search
"Recommend a doctor for acne" = doctor_search

13. Questions about hospitals:

"Which hospital has the best rating?" = hospital_search
"Give me highly rated hospitals" = hospital_search
"Which hospital is best near me?" = hospital_search

14. Symptom questions:

"My leg is paining what should I do?" = symptom_identification

15. Very vague questions:

"I don't feel well" = clarification
"Help me" = clarification
"Something is wrong" = clarification

16. Emergency symptoms such as severe chest pain, severe difficulty breathing, sudden paralysis, difficulty speaking, loss of consciousness, severe bleeding or suicidal thoughts require urgent medical attention.

17. For emergencies tell the user to seek emergency care immediately and call 112 in India when appropriate.

18. Do not claim to be a doctor.

19. Use simple language.

20. Medical information is educational and does not replace professional medical advice.
`;

/* =========================================================
   TYPES
========================================================= */

type Specialty = {
  id: string;
  name: string;
  medical_name: string | null;
};

type AiIntent = {
  intent:
  | "general_health"
  | "doctor_search"
  | "hospital_search"
  | "symptom_identification"
  | "clarification"
  | "emergency";

  concern: string | null;
  specialty: string | null;
  confidence: number;
  clarificationQuestion: string | null;
  clarificationOptions: string[];
};

type DoctorResult = {
  id: string;
  slug: string | null;
  name: string;
  specialty: string;
  hospital: string;
  qualification: string | null;
  experience_years: number | null;
  rating: number | null;
  reviews_count: number | null;
  fee: number | null;
};

type HospitalResult = {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  address: string | null;
  rating: number | null;
  reviews_count: number | null;
  emergency: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
};

/* =========================================================
   TEXT NORMALIZATION
========================================================= */

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanJson(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/* =========================================================
   EMERGENCY
========================================================= */

function isEmergencyMessage(message: string) {
  const text = normalizeText(message);

  const patterns = [
    "severe chest pain",
    "chest pain and difficulty breathing",
    "cannot breathe",
    "cant breathe",
    "difficulty breathing",
    "severe difficulty breathing",
    "loss of consciousness",
    "unconscious",
    "heavy bleeding",
    "severe bleeding",
    "sudden paralysis",
    "sudden weakness",
    "face drooping",
    "difficulty speaking",
    "cannot speak",
    "cant speak",
    "suicidal thoughts",
    "want to kill myself",
  ];

  return patterns.some((pattern) =>
    text.includes(pattern),
  );
}

/* =========================================================
   HOSPITAL REQUEST
========================================================= */

function isHospitalRequest(message: string) {
  const text = normalizeText(message);

  const phrases = [
    "hospital",
    "hospitals",
    "best hospital",
    "best hospitals",
    "best rated hospital",
    "best rated hospitals",
    "hospital with best rating",
    "hospital has best rating",
    "hospital with highest rating",
    "highest rated hospital",
    "highest rated hospitals",
    "highly rated hospital",
    "highly rated hospitals",
    "good hospital",
    "good hospitals",
    "top hospital",
    "top hospitals",
    "hospital near me",
    "hospitals near me",
    "hospital nearby",
    "hospitals nearby",
    "nearby hospital",
    "nearby hospitals",
    "recommend a hospital",
    "recommend hospitals",
    "find a hospital",
    "find hospitals",
  ];

  return phrases.some((phrase) =>
    text.includes(phrase),
  );
}

/* =========================================================
   DOCTOR REQUEST
========================================================= */

function isDoctorRequest(message: string) {
  const text = normalizeText(message);

  const phrases = [
    "which doctor",
    "what doctor",
    "best doctor",
    "doctor for",
    "doctor should i see",
    "which specialist",
    "what specialist",
    "specialist for",
    "who should i see",
    "recommend a doctor",
    "recommend doctor",
    "recommend doctors",
    "find a doctor",
    "find doctors",
    "need a doctor",
    "need doctor",
    "doctor to see",
    "specialist to see",
  ];

  return phrases.some((phrase) =>
    text.includes(phrase),
  );
}

/* =========================================================
   DIRECT SPECIALTY RULES
========================================================= */

const DIRECT_SPECIALTY_RULES = [
  {
    specialties: [
      "neurology",
      "neurologist",
    ],

    concerns: [
      "headache",
      "headaches",
      "migraine",
      "migraines",
      "head pain",
      "head hurts",
      "head is hurting",
      "head is paining",
      "my head hurts",
      "my head is hurting",
      "my head is paining",
      "frequent headache",
      "recurring headache",
      "nerve pain",
      "numbness",
      "tingling",
      "tremor",
      "tremors",
      "seizure",
      "seizures",
    ],
  },

  {
    specialties: [
      "orthopedics",
      "orthopaedics",
      "orthopedic",
      "orthopaedic",
    ],

    concerns: [
      "leg pain",
      "leg is paining",
      "my leg is paining",
      "my leg hurts",
      "leg hurts",
      "pain in my leg",
      "pain in leg",
      "legs are paining",
      "both legs are paining",
      "knee pain",
      "knee hurts",
      "pain in my knee",
      "back pain",
      "back hurts",
      "pain in my back",
      "shoulder pain",
      "shoulder hurts",
      "neck pain",
      "neck hurts",
      "hip pain",
      "hip hurts",
      "bone pain",
      "bone problem",
      "bone problems",
      "joint pain",
      "joint problem",
      "joint problems",
      "fracture",
      "arthritis",
      "muscle pain",
      "muscle problem",
      "muscle problems",
    ],
  },

  {
    specialties: [
      "dermatology",
      "dermatologist",
    ],

    concerns: [
      "skin problem",
      "skin problems",
      "skin issue",
      "skin issues",
      "rash",
      "rashes",
      "acne",
      "pimples",
      "itchy skin",
      "itching",
      "eczema",
      "psoriasis",
      "hair loss",
      "hair fall",
    ],
  },

  {
    specialties: [
      "gastroenterology",
      "gastroenterologist",
    ],

    concerns: [
      "stomach problem",
      "stomach problems",
      "stomach issue",
      "stomach issues",
      "stomach pain",
      "stomach ache",
      "stomachache",
      "acidity",
      "acid reflux",
      "heartburn",
      "burning after eating",
      "food comes back up",
      "reflux",
      "indigestion",
      "constipation",
      "diarrhea",
      "loose motion",
    ],
  },

  {
    specialties: [
      "cardiology",
      "cardiologist",
    ],

    concerns: [
      "heart problem",
      "heart problems",
      "heart pain",
      "palpitations",
      "fast heartbeat",
      "irregular heartbeat",
    ],
  },

  {
    specialties: [
      "ophthalmology",
      "ophthalmologist",
    ],

    concerns: [
      "eye problem",
      "eye problems",
      "eye pain",
      "blurry vision",
      "blurred vision",
      "vision problem",
      "vision problems",
      "eye infection",
    ],
  },

  {
    specialties: [
      "ent",
      "otolaryngology",
      "otolaryngologist",
    ],

    concerns: [
      "ear pain",
      "ear problem",
      "ear problems",
      "hearing problem",
      "hearing problems",
      "hearing loss",
      "sore throat",
      "throat problem",
      "throat problems",
      "sinus problem",
      "sinus problems",
      "sinusitis",
      "nose problem",
      "nose problems",
    ],
  },

  {
    specialties: [
      "dentistry",
      "dentist",
      "dental",
    ],

    concerns: [
      "tooth pain",
      "toothache",
      "teeth pain",
      "teeth problem",
      "teeth problems",
      "dental problem",
      "dental problems",
      "gum pain",
      "gum problem",
      "gum problems",
    ],
  },

  {
    specialties: [
      "gynecology",
      "gynaecology",
      "gynecologist",
      "gynaecologist",
    ],

    concerns: [
      "period problem",
      "period problems",
      "period pain",
      "menstrual problem",
      "menstrual problems",
      "pregnancy",
      "pregnant",
      "ovary",
      "ovarian",
      "uterus",
      "uterine",
    ],
  },

  {
    specialties: [
      "pediatrics",
      "paediatrics",
      "pediatrician",
      "paediatrician",
    ],

    concerns: [
      "baby",
      "infant",
      "child",
      "children",
      "kid",
      "my son",
      "my daughter",
    ],
  },
];

/* =========================================================
   DIRECT SPECIALTY MATCH
========================================================= */

function findDirectSpecialty(
  message: string,
  specialties: Specialty[],
) {
  const text = normalizeText(message);

  for (const rule of DIRECT_SPECIALTY_RULES) {
    const concern = rule.concerns.find((keyword) =>
      text.includes(normalizeText(keyword)),
    );

    if (!concern) continue;

    const specialty = specialties.find((item) => {
      const name = normalizeText(item.name);
      const medicalName = normalizeText(
        item.medical_name ?? "",
      );

      return rule.specialties.some((keyword) => {
        const normalized = normalizeText(keyword);

        return (
          name === normalized ||
          medicalName === normalized ||
          name.includes(normalized) ||
          medicalName.includes(normalized)
        );
      });
    });

    if (specialty) {
      return {
        specialty,
        concern,
      };
    }
  }

  return {
    specialty: null,
    concern: null,
  };
}

/* =========================================================
   MATCH GEMINI SPECIALTY
========================================================= */

function matchSpecialty(
  specialtyName: string | null,
  specialties: Specialty[],
) {
  if (!specialtyName) return null;

  const normalized = normalizeText(
    specialtyName,
  );

  const exact = specialties.find((item) => {
    return (
      normalizeText(item.name) === normalized ||
      normalizeText(
        item.medical_name ?? "",
      ) === normalized
    );
  });

  if (exact) return exact;

  const partial = specialties.find((item) => {
    const name = normalizeText(item.name);
    const medicalName = normalizeText(
      item.medical_name ?? "",
    );

    return (
      name.includes(normalized) ||
      normalized.includes(name) ||
      medicalName.includes(normalized) ||
      normalized.includes(medicalName)
    );
  });

  return partial ?? null;
}

/* =========================================================
   GEMINI INTENT
========================================================= */

async function analyzeUserMessage(
  apiKey: string,
  message: string,
  history: {
    role: "user" | "assistant";
    content: string;
  }[],
  specialties: Specialty[],
): Promise<AiIntent> {
  const specialtyList = specialties
    .map(
      (item) =>
        `- ${item.name}${item.medical_name
          ? ` (${item.medical_name})`
          : ""
        }`,
    )
    .join("\n");

  const prompt = `
Analyze the healthcare request below.

USER MESSAGE:
${message}

AVAILABLE SPECIALTIES:
${specialtyList}

PREVIOUS CONVERSATION:
${history
      .slice(-8)
      .map(
        (item) =>
          `${item.role}: ${item.content}`,
      )
      .join("\n")}

Return ONLY valid JSON.

Use:

{
  "intent": "general_health | doctor_search | hospital_search | symptom_identification | clarification | emergency",
  "concern": "short concern or null",
  "specialty": "exact specialty from available specialties or null",
  "confidence": 0.0,
  "clarificationQuestion": "question or null",
  "clarificationOptions": []
}

CLASSIFICATION:

"What is migraine?"
=> general_health

"What causes migraine?"
=> general_health

"What is acne?"
=> general_health

"Which doctor is best for headaches?"
=> doctor_search

"Which doctor should I see for leg pain?"
=> doctor_search

"Recommend a doctor for acne"
=> doctor_search

"My leg is paining what should I do?"
=> symptom_identification

"Which hospital has the best rating?"
=> hospital_search

"Give me highly rated hospitals"
=> hospital_search

"Which hospital is best near me?"
=> hospital_search

"I don't feel well"
=> clarification

"Help me"
=> clarification

"Something is wrong"
=> clarification

IMPORTANT:

Do NOT use clarification simply because a specialty is unknown.

Do NOT use clarification for a clear question.

If the user asks about a doctor, use doctor_search.

If the user asks about a hospital, use hospital_search.

If the user asks general medical information, use general_health.

Never diagnose.
Never prescribe.
Never invent information.
`;

  const contents = [
    ...history.slice(-8).map((item) => ({
      role:
        item.role === "assistant"
          ? "model"
          : "user",

      parts: [
        {
          text: item.content,
        },
      ],
    })),

    {
      role: "user",

      parts: [
        {
          text: prompt,
        },
      ],
    },
  ];

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: SYSTEM_PROMPT,
            },
          ],
        },

        contents,

        generationConfig: {
          maxOutputTokens: 500,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Gemini analysis error:",
      response.status,
      errorText,
    );

    throw new Error(
      `Gemini API error (${response.status})`,
    );
  }

  const json =
    await response.json();

  const text =
    json.candidates?.[0]?.content?.parts
      ?.map(
        (part: { text?: string }) =>
          part.text || "",
      )
      .join("")
      .trim() || "";

  try {
    return JSON.parse(
      cleanJson(text),
    ) as AiIntent;
  } catch (error) {
    console.error(
      "Gemini JSON parsing error:",
      text,
      error,
    );

    /*
     * IMPORTANT:
     * Do not show random clarification buttons
     * if Gemini JSON parsing fails.
     */

    return {
      intent: "general_health",
      concern: null,
      specialty: null,
      confidence: 0,
      clarificationQuestion: null,
      clarificationOptions: [],
    };
  }
}

/* =========================================================
   FIND DOCTORS
========================================================= */

async function findDoctors(
  supabaseAdmin: any,
  specialty: Specialty,
): Promise<DoctorResult[]> {
  const {
    data: doctors,
    error,
  } = await supabaseAdmin
    .from("doctors")
    .select(
      `
      id,
      slug,
      name,
      specialty_id,
      hospital_id,
      qualification,
      experience_years,
      rating,
      reviews_count,
      fee
      `,
    )
    .eq(
      "specialty_id",
      specialty.id,
    )
    .limit(50);

  if (error) {
    console.error(
      "Doctor query error:",
      error,
    );

    return [];
  }

  if (!doctors?.length) {
    return [];
  }

  const hospitalIds = [
    ...new Set(
      doctors
        .map(
          (doctor: any) =>
            doctor.hospital_id,
        )
        .filter(Boolean),
    ),
  ];

  let hospitals: any[] = [];

  if (hospitalIds.length > 0) {
    const {
      data,
      error: hospitalError,
    } = await supabaseAdmin
      .from("hospitals")
      .select(
        "id,name,city,address",
      )
      .in(
        "id",
        hospitalIds,
      );

    if (hospitalError) {
      console.error(
        "Hospital lookup error:",
        hospitalError,
      );
    } else {
      hospitals = data ?? [];
    }
  }

  const results: DoctorResult[] =
    doctors.map(
      (doctor: any) => {
        const hospital =
          hospitals.find(
            (item: any) =>
              item.id ===
              doctor.hospital_id,
          );

        return {
          id: doctor.id,

          slug:
            doctor.slug,

          name:
            doctor.name,

          specialty:
            specialty.name,

          hospital:
            hospital?.name ??
            "Hospital not available",

          qualification:
            doctor.qualification,

          experience_years:
            doctor.experience_years,

          rating:
            doctor.rating,

          reviews_count:
            doctor.reviews_count,

          fee:
            doctor.fee,
        };
      },
    );

  /*
   * Rank doctors.
   */

  results.sort((a, b) => {
    const ratingA =
      Number(a.rating ?? 0);

    const ratingB =
      Number(b.rating ?? 0);

    const experienceA =
      Number(
        a.experience_years ?? 0,
      );

    const experienceB =
      Number(
        b.experience_years ?? 0,
      );

    const reviewsA =
      Number(
        a.reviews_count ?? 0,
      );

    const reviewsB =
      Number(
        b.reviews_count ?? 0,
      );

    const scoreA =
      ratingA * 0.55 +
      Math.min(
        experienceA / 20,
        1,
      ) *
      0.25 +
      Math.min(
        Math.log10(
          reviewsA + 1,
        ) / 3,
        1,
      ) *
      0.2;

    const scoreB =
      ratingB * 0.55 +
      Math.min(
        experienceB / 20,
        1,
      ) *
      0.25 +
      Math.min(
        Math.log10(
          reviewsB + 1,
        ) / 3,
        1,
      ) *
      0.2;

    return scoreB - scoreA;
  });

  return results.slice(0, 5);
}

/* =========================================================
   RELATED HOSPITALS
========================================================= */

async function findRelatedHospitals(
  supabaseAdmin: any,
  specialtyId: string,
): Promise<HospitalResult[]> {
  const {
    data: doctors,
    error: doctorError,
  } = await supabaseAdmin
    .from("doctors")
    .select("hospital_id")
    .eq(
      "specialty_id",
      specialtyId,
    )
    .limit(100);

  if (doctorError) {
    console.error(
      "Related doctor query error:",
      doctorError,
    );

    return [];
  }

  if (!doctors?.length) {
    return [];
  }

  const hospitalIds = [
    ...new Set(
      doctors
        .map(
          (doctor: any) =>
            doctor.hospital_id,
        )
        .filter(Boolean),
    ),
  ];

  if (!hospitalIds.length) {
    return [];
  }

  const {
    data: hospitals,
    error: hospitalError,
  } = await supabaseAdmin
    .from("hospitals")
    .select(
      `
      id,
      slug,
      name,
      city,
      address,
      rating,
      reviews_count,
      emergency
      `,
    )
    .in(
      "id",
      hospitalIds,
    );

  if (hospitalError) {
    console.error(
      "Related hospital query error:",
      hospitalError,
    );

    return [];
  }

  const results: HospitalResult[] =
    (hospitals ?? []).map(
      (hospital: any) => ({
        id: hospital.id,

        slug:
          hospital.slug,

        name:
          hospital.name,

        city:
          hospital.city,

        address:
          hospital.address,

        rating:
          hospital.rating,

        reviews_count:
          hospital.reviews_count,

        emergency:
          hospital.emergency,
      }),
    );

  results.sort((a, b) => {
    const ratingA =
      Number(a.rating ?? 0);

    const ratingB =
      Number(b.rating ?? 0);

    const reviewsA =
      Number(
        a.reviews_count ?? 0,
      );

    const reviewsB =
      Number(
        b.reviews_count ?? 0,
      );

    const scoreA =
      ratingA * 0.75 +
      Math.min(
        Math.log10(
          reviewsA + 1,
        ) / 4,
        1,
      ) *
      0.25;

    const scoreB =
      ratingB * 0.75 +
      Math.min(
        Math.log10(
          reviewsB + 1,
        ) / 4,
        1,
      ) *
      0.25;

    return scoreB - scoreA;
  });

  return results.slice(0, 5);
}

/* =========================================================
   ALL HOSPITALS
========================================================= */

async function findHospitals(
  supabaseAdmin: any,
): Promise<HospitalResult[]> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("hospitals")
    .select(
      `
      id,
      slug,
      name,
      city,
      address,
      rating,
      reviews_count,
      emergency
      `,
    )
    .limit(100);

  if (error) {
    console.error(
      "Hospital query error:",
      error,
    );

    return [];
  }

  const hospitals: HospitalResult[] =
    (data ?? []).map(
      (hospital: any) => ({
        id: hospital.id,

        slug:
          hospital.slug,

        name:
          hospital.name,

        city:
          hospital.city,

        address:
          hospital.address,

        rating:
          hospital.rating,

        reviews_count:
          hospital.reviews_count,

        emergency:
          hospital.emergency,
      }),
    );

  hospitals.sort((a, b) => {
    const ratingA =
      Number(a.rating ?? 0);

    const ratingB =
      Number(b.rating ?? 0);

    const reviewsA =
      Number(
        a.reviews_count ?? 0,
      );

    const reviewsB =
      Number(
        b.reviews_count ?? 0,
      );

    const scoreA =
      ratingA * 0.75 +
      Math.min(
        Math.log10(
          reviewsA + 1,
        ) / 4,
        1,
      ) *
      0.25;

    const scoreB =
      ratingB * 0.75 +
      Math.min(
        Math.log10(
          reviewsB + 1,
        ) / 4,
        1,
      ) *
      0.25;

    return scoreB - scoreA;
  });

  return hospitals.slice(0, 5);
}

/* =========================================================
   GEMINI FINAL ANSWER
========================================================= */

async function generateGeminiAnswer(
  apiKey: string,
  message: string,
  history: {
    role: "user" | "assistant";
    content: string;
  }[],
) {
  const contents = [
    ...history.slice(-10).map((item) => ({
      role:
        item.role === "assistant"
          ? "model"
          : "user",

      parts: [
        {
          text: item.content,
        },
      ],
    })),

    {
      role: "user",

      parts: [
        {
          text: message,
        },
      ],
    },
  ];

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "x-goog-api-key":
          apiKey,
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: SYSTEM_PROMPT,
            },
          ],
        },

        contents,

        generationConfig: {
          maxOutputTokens: 700,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Gemini answer error:",
      response.status,
      errorText,
    );

    throw new Error(
      `Gemini API error (${response.status})`,
    );
  }

  const json =
    await response.json();

  const answer =
    json.candidates?.[0]?.content?.parts
      ?.map(
        (part: { text?: string }) =>
          part.text || "",
      )
      .join("")
      .trim();

  return (
    answer ||
    "Sorry, I could not generate an answer right now."
  );
}

/* =========================================================
   MAIN ASK ASSISTANT
========================================================= */

export const askAssistant =
  createServerFn({
    method: "POST",
  })
    .validator((data: unknown) =>
      schema.parse(data),
    )
    .handler(async ({ data }) => {
      const {
        supabaseAdmin,
      } = await import(
        "@/integrations/supabase/client.server"
      );

      /* =====================================================
         VERIFY CONVERSATION
      ===================================================== */

      const {
        data: conversation,
        error: conversationError,
      } = await supabaseAdmin
        .from("chat_conversations")
        .select("id")
        .eq(
          "id",
          data.conversationId,
        )
        .eq(
          "user_id",
          data.userId,
        )
        .maybeSingle();

      if (conversationError) {
        console.error(
          "Conversation error:",
          conversationError,
        );

        throw new Error(
          "The conversation could not be accessed.",
        );
      }

      if (!conversation) {
        throw new Error(
          "You are not allowed to use this conversation.",
        );
      }

      /* =====================================================
         GEMINI KEY
      ===================================================== */

      const apiKey =
        process.env["GEMINI_API_KEY"];

      if (!apiKey) {
        throw new Error(
          "GEMINI_API_KEY is missing.",
        );
      }

      /* =====================================================
         SPECIALTIES
      ===================================================== */

      const {
        data: specialties,
        error: specialtiesError,
      } = await supabaseAdmin
        .from("specialties")
        .select(
          "id,name,medical_name",
        )
        .order("sort_order", {
          ascending: true,
        });

      if (specialtiesError) {
        console.error(
          "Specialty query error:",
          specialtiesError,
        );
      }

      const availableSpecialties =
        (specialties ??
          []) as Specialty[];

      /* =====================================================
         EMERGENCY
      ===================================================== */

      if (
        isEmergencyMessage(
          data.message,
        )
      ) {
        const hospitals =
          await findHospitals(
            supabaseAdmin,
          );

        return saveAndReturn({
          supabaseAdmin,
          data,

          reply:
            "Your symptoms may require urgent medical attention. Please seek emergency medical care immediately and call 112 in India if you are in immediate danger. Do not wait for an online consultation.",

          doctors: [],
          hospitals,
          clarificationOptions: [],
        });
      }

      /* =====================================================
         DIRECT SPECIALTY
      ===================================================== */

      const directMatch =
        findDirectSpecialty(
          data.message,
          availableSpecialties,
        );

      /* =====================================================
         GEMINI CLASSIFICATION
      ===================================================== */

      const intent =
        await analyzeUserMessage(
          apiKey,
          data.message,
          data.history,
          availableSpecialties,
        );

      console.log(
        "cityhealth intent:",
        intent,
      );

      /* =====================================================
         MATCH SPECIALTY
      ===================================================== */

      let matchedSpecialty =
        matchSpecialty(
          intent.specialty,
          availableSpecialties,
        );

      if (
        !matchedSpecialty &&
        directMatch.specialty
      ) {
        matchedSpecialty =
          directMatch.specialty;
      }

      /* =====================================================
         HOSPITAL SEARCH
      ===================================================== */

      if (
        intent.intent ===
        "hospital_search" ||
        isHospitalRequest(
          data.message,
        )
      ) {
        const hospitals =
          await findHospitals(
            supabaseAdmin,
          );

        const reply =
          await generateGeminiAnswer(
            apiKey,
            data.message,
            data.history,
          );

        return saveAndReturn({
          supabaseAdmin,
          data,

          reply,

          doctors: [],

          hospitals,

          clarificationOptions: [],
        });
      }

      /* =====================================================
         DOCTOR SEARCH
      ===================================================== */

      if (
        intent.intent ===
        "doctor_search" ||
        isDoctorRequest(
          data.message,
        )
      ) {
        if (matchedSpecialty) {
          const doctors =
            await findDoctors(
              supabaseAdmin,
              matchedSpecialty,
            );

          const hospitals =
            await findRelatedHospitals(
              supabaseAdmin,
              matchedSpecialty.id,
            );

          const reply =
            await generateGeminiAnswer(
              apiKey,
              data.message,
              data.history,
            );

          return saveAndReturn({
            supabaseAdmin,
            data,

            reply,

            doctors,

            hospitals,

            clarificationOptions: [],
          });
        }

        /*
         * Only now do we ask clarification.
         */

        return saveAndReturn({
          supabaseAdmin,
          data,

          reply:
            "I can help you find a suitable doctor. Could you tell me a little more about the health problem?",

          doctors: [],

          hospitals: [],

          clarificationOptions: [
            "Headache or head pain",

            "Leg, knee or joint pain",

            "Stomach or digestion problems",

            "Skin problems",

            "Eye or vision problems",

            "Ear, nose or throat problems",
          ],
        });
      }

      /* =====================================================
         GENERAL HEALTH / SYMPTOMS
      ===================================================== */

      if (
        intent.intent ===
        "general_health" ||
        intent.intent ===
        "symptom_identification"
      ) {
        let doctors: DoctorResult[] =
          [];

        let hospitals: HospitalResult[] =
          [];

        if (matchedSpecialty) {
          doctors =
            await findDoctors(
              supabaseAdmin,
              matchedSpecialty,
            );

          hospitals =
            await findRelatedHospitals(
              supabaseAdmin,
              matchedSpecialty.id,
            );
        }

        const reply =
          await generateGeminiAnswer(
            apiKey,
            data.message,
            data.history,
          );

        return saveAndReturn({
          supabaseAdmin,
          data,

          reply,

          doctors,

          hospitals,

          clarificationOptions: [],
        });
      }

      /* =====================================================
         CLARIFICATION
      ===================================================== */

      if (
        intent.intent ===
        "clarification"
      ) {
        return saveAndReturn({
          supabaseAdmin,
          data,

          reply:
            intent.clarificationQuestion ||
            "Could you tell me a little more about what you are experiencing?",

          doctors: [],

          hospitals: [],

          clarificationOptions:
            intent.clarificationOptions
              ?.length
              ? intent.clarificationOptions
              : [
                "Headache or head pain",

                "Fever or feeling hot",

                "Tiredness or weakness",

                "Leg, knee or joint pain",

                "Stomach or digestion problems",

                "Skin problems",
              ],
        });
      }

      /* =====================================================
         FALLBACK
      ===================================================== */

      const reply =
        await generateGeminiAnswer(
          apiKey,
          data.message,
          data.history,
        );

      return saveAndReturn({
        supabaseAdmin,
        data,

        reply,

        doctors: [],

        hospitals: [],

        clarificationOptions: [],
      });
    });

/* =========================================================
   SAVE CHAT
========================================================= */

async function saveAndReturn({
  supabaseAdmin,
  data,
  reply,
  doctors,
  hospitals,
  clarificationOptions,
}: {
  supabaseAdmin: any;

  data: z.infer<
    typeof schema
  >;

  reply: string;

  doctors: DoctorResult[];

  hospitals: HospitalResult[];

  clarificationOptions: string[];
}) {
  /* =====================================================
     IMPORTANT:
     Metadata belongs to ASSISTANT message.
  ===================================================== */

  const {
    error: insertError,
  } = await supabaseAdmin
    .from("chat_messages")
    .insert([
      {
        conversation_id:
          data.conversationId,

        user_id:
          data.userId,

        role: "user",

        content:
          data.message,
      },

      {
        conversation_id:
          data.conversationId,

        user_id:
          data.userId,

        role: "assistant",

        content:
          reply,

        metadata: {
          doctors:
            doctors ?? [],

          hospitals:
            hospitals ?? [],

          clarificationOptions:
            clarificationOptions ?? [],
        },
      },
    ]);

  if (insertError) {
    console.error(
      "Chat insert error:",
      insertError,
    );

    throw new Error(
      "The assistant response could not be saved.",
    );
  }

  /* =====================================================
     UPDATE CONVERSATION
  ===================================================== */

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("chat_conversations")
    .update({
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      data.conversationId,
    )
    .eq(
      "user_id",
      data.userId,
    );

  if (updateError) {
    console.error(
      "Conversation update error:",
      updateError,
    );

    throw new Error(
      "The conversation could not be updated.",
    );
  }

  /* =====================================================
     RETURN TO FRONTEND
  ===================================================== */

  return {
    reply,

    doctors,

    hospitals,

    clarificationOptions,
  };
}