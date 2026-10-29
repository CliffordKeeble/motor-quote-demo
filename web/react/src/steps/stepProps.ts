import type { Answers } from '@shared/types';
import type { Errors } from '@shared/validation';

export interface StepProps {
  answers: Answers;
  errors: Errors;
  set: (field: keyof Answers, value: string) => void;
}
