import type { Answers } from '../types';
import type { Errors } from '../validation';

export interface StepProps {
  answers: Answers;
  errors: Errors;
  set: (field: keyof Answers, value: string) => void;
}
