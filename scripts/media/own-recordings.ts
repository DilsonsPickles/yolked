/**
 * Local recordings and GIFs to attach to exercises. Paths are on the owner's
 * Mac and are not committed anywhere; only the encoded output is uploaded.
 */
export interface OwnRecording {
  file: string;
  exercise_id: string;
  /** "own" = the owner's form video; "clip" = trainer material (GIF steps, full routine). */
  kind: "own" | "clip";
  label: string;
}

const B1P1 = "/Users/alexdawsonsmac/Desktop/Movement/B1P1";
const UBSM = "/Users/alexdawsonsmac/Desktop/Movement/Upper-body Strength & Mobility";
const WRIST = "mm_5_wrist_strength_mobility_routine";

export const OWN_RECORDINGS: OwnRecording[] = [
  // Form submissions recorded for the trainer (B1P1 video checklist)
  { file: `${B1P1}/Inverted-hang (ext, flex AND hip-piking).MOV`, exercise_id: "mm_inverted_hang_ext_flex_and_hip_piking", kind: "own", label: "B1P1 submission" },
  { file: `${B1P1}/Lateral Role (back & forth AND lengths).MOV`, exercise_id: "mm_lateral_role_back_forth_and_lengths", kind: "own", label: "B1P1 submission" },
  { file: `${B1P1}/Low-bridge slide.mov`, exercise_id: "mm_low_bridge_slide", kind: "own", label: "B1P1 submission" },
  { file: `${B1P1}/Protracted pushup.MOV`, exercise_id: "mm_protracted_pushup", kind: "own", label: "B1P1 submission" },
  { file: `${B1P1}/Ring row progression.mov`, exercise_id: "mm_ring_row_progression", kind: "own", label: "B1P1 submission" },
  { file: `${B1P1}/Split squat.MOV`, exercise_id: "mm_split_squat", kind: "own", label: "B1P1 submission" },

  // Trainer's 5' wrist routine: full video plus the ten captioned steps
  { file: `${UBSM}/mp4/5' wrist mobilization, strength & mobility routine.mp4`, exercise_id: WRIST, kind: "clip", label: "Full routine" },
  ...Array.from({ length: 10 }, (_, i) => ({
    file: `${UBSM}/gif/compressed/A${i + 1}-.gif`,
    exercise_id: WRIST,
    kind: "clip" as const,
    label: `Step ${i + 1}`,
  })),
];
