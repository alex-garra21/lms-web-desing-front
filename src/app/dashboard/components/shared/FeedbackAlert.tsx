// src/app/dashboard/components/shared/FeedbackAlert.tsx
"use client";

import { StatusFeedback } from '../../types';

interface FeedbackAlertProps {
  feedback: StatusFeedback | null;
  onClose: () => void;
}

/**
 * @deprecated Los banners estáticos han sido sustituidos por ToastContainer según directrices.md.
 * Este componente se conserva como stub no intrusivo para compatibilidad si fuera referenciado.
 */
export function FeedbackAlert({ feedback, onClose }: FeedbackAlertProps) {
  return null;
}

export default FeedbackAlert;
