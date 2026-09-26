/**
 * Seeded goal ladders. Exercise ids starting with `mm_` come from the MoveMore
 * programmes (data/movemore/*.json); `u_` ids are created by the seed with the
 * details given here.
 */
import type {
  ExerciseKind,
  GoalKind,
  PrescriptionMethod,
} from "../../src/lib/types/database";

export interface LadderExercise {
  id: string;
  name?: string;
  kind?: ExerciseKind;
  muscles?: string[];
  equipment?: string;
}

export interface LadderRung {
  exercise: LadderExercise;
  target_sets?: number;
  target_reps?: number;
  target_reps_max?: number;
  target_seconds?: number;
  tempo?: string;
  method?: PrescriptionMethod;
  each_side?: boolean;
  prescription_text?: string;
  graduate_when: string;
}

export interface LadderGoal {
  name: string;
  kind: GoalKind;
  description: string;
  pass_condition: string;
  rungs: LadderRung[];
}

const pullUp: LadderExercise = {
  id: "u_pull_up",
  name: "Pull-up",
  kind: "strength",
  muscles: ["lats", "biceps"],
  equipment: "body only",
};
const ringDip: LadderExercise = {
  id: "u_ring_dip",
  name: "Ring dip",
  kind: "strength",
  muscles: ["chest", "triceps"],
  equipment: "other",
};
const falseGripRow: LadderExercise = {
  id: "u_false_grip_ring_row",
  name: "False-grip ring row",
  kind: "strength",
  muscles: ["lats", "forearms"],
  equipment: "other",
};
const chestToBar: LadderExercise = {
  id: "u_chest_to_bar_pull_up",
  name: "Chest-to-bar pull-up",
  kind: "strength",
  muscles: ["lats", "biceps"],
  equipment: "body only",
};
const muscleUpNegative: LadderExercise = {
  id: "u_muscle_up_negative",
  name: "Muscle-up negative",
  kind: "strength",
  muscles: ["lats", "chest", "triceps"],
  equipment: "other",
};
const assistedMuscleUp: LadderExercise = {
  id: "u_assisted_muscle_up",
  name: "Band-assisted / low-ring muscle up",
  kind: "strength",
  muscles: ["lats", "chest", "triceps"],
  equipment: "bands",
};
const muscleUp: LadderExercise = {
  id: "u_muscle_up",
  name: "Muscle up",
  kind: "skill",
  muscles: ["lats", "chest", "triceps"],
  equipment: "other",
};
const floorPancake: LadderExercise = {
  id: "u_floor_pancake",
  name: "Floor pancake",
  kind: "mobility",
  muscles: ["adductors", "hamstrings"],
  equipment: "body only",
};

export const GOALS: LadderGoal[] = [
  {
    name: "Muscle up",
    kind: "strength",
    description:
      "Pulling strength, false grip and the transition, built on the ring row and ring support work from the programme.",
    pass_condition: "One clean muscle up on rings or bar, no kip.",
    rungs: [
      {
        exercise: { id: "mm_pronated_supinated_and_active_hang" },
        target_sets: 1,
        target_seconds: 60,
        method: "accu",
        each_side: true,
        prescription_text: "60” accumulated each grip + 5x 3” active iso.",
        graduate_when: "60 s passive and 30 s active hang, unbroken",
      },
      {
        exercise: { id: "mm_ring_row_progression" },
        target_sets: 3,
        target_reps: 8,
        tempo: "[3012]",
        graduate_when: "3×8 clean reps at the deepest progression",
      },
      {
        exercise: pullUp,
        target_sets: 3,
        target_reps: 5,
        graduate_when: "3×8 full-range pull-ups",
      },
      {
        exercise: { id: "mm_ring_support_assisted_or_full" },
        target_sets: 3,
        target_seconds: 15,
        method: "iso",
        graduate_when: "3×30 s full ring support, turned out",
      },
      {
        exercise: ringDip,
        target_sets: 3,
        target_reps: 5,
        graduate_when: "3×8 full-depth ring dips",
      },
      {
        exercise: falseGripRow,
        target_sets: 3,
        target_reps: 6,
        graduate_when: "3×8 with chest to the rings",
      },
      {
        exercise: chestToBar,
        target_sets: 3,
        target_reps: 5,
        graduate_when: "3×5 with the sternum at the bar",
      },
      {
        exercise: muscleUpNegative,
        target_sets: 3,
        target_reps: 3,
        tempo: "[5010]",
        prescription_text: "3×3 slow negatives, 5” through the transition",
        graduate_when: "3×3 at 5 s each, controlled through the transition",
      },
      {
        exercise: assistedMuscleUp,
        target_sets: 3,
        target_reps: 3,
        graduate_when: "3 clean unassisted reps",
      },
      {
        exercise: muscleUp,
        target_sets: 1,
        target_reps: 1,
        graduate_when: "Pass condition met",
      },
    ],
  },
  {
    name: "Pancake",
    kind: "mobility",
    description:
      "Hip flexion and adduction range, following the programme's butterfly, elevated pancake and good-morning progression.",
    pass_condition: "Chest to the floor in a wide straddle, back flat, held for 60 s.",
    rungs: [
      {
        exercise: { id: "mm_standing_and_seated_pike_stretching" },
        target_sets: 2,
        target_seconds: 60,
        prescription_text: "60” standing + 60” seated, breathing to end-range",
        graduate_when: "Comfortable flat back at 60 s in both",
      },
      {
        exercise: { id: "mm_loaded_butterfly_contract_relax_method_1" },
        target_sets: 1,
        target_reps: 5,
        target_reps_max: 8,
        method: "cr",
        prescription_text: "CR: 5-8x (5” contract / 5” relax)",
        graduate_when: "Knees within a fist of the floor",
      },
      {
        exercise: { id: "mm_cross_leg_stretch_progression" },
        target_sets: 1,
        target_seconds: 30,
        method: "cr",
        each_side: true,
        prescription_text: "30” CR + 30” breathing to end-range ea.",
        graduate_when: "Both sides even, no pinching",
      },
      {
        exercise: { id: "mm_elevated_pancake_iso_unloaded" },
        target_sets: 1,
        target_seconds: 60,
        method: "cr",
        graduate_when: "Chest to the elevated surface",
      },
      {
        exercise: { id: "mm_unilateral_good_morning_cr_only" },
        target_sets: 3,
        target_seconds: 30,
        method: "ds",
        each_side: true,
        prescription_text: "DS: 30”, 25”, 20” CR ea. to deepest range",
        graduate_when: "Full range each side with a flat back",
      },
      {
        exercise: { id: "mm_elevated_top_loaded_pancake" },
        target_sets: 1,
        target_seconds: 60,
        method: "cr",
        graduate_when: "Chest to the floor from the elevation",
      },
      {
        exercise: floorPancake,
        target_sets: 2,
        target_seconds: 60,
        graduate_when: "Pass condition met",
      },
    ],
  },
];
