import { FeedbackBoard } from "@/components/dashboard/feedback-board";
import { getMyReview } from "@/actions/feedback";

export default async function FeedbackPage() {
  const { review } = await getMyReview();
  return <FeedbackBoard initialReview={review} />;
}
