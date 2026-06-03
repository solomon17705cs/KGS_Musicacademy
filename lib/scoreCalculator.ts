export function calculateProgressScore(params: {
  teacherRating: number;
  practiceScore: number;
  homeworkCompletion: number;
}): { finalScore: number; label: string } {
  const teacherScore = (params.teacherRating / 5) * 100;
  const finalScore = Math.round(
    teacherScore * 0.5 + params.practiceScore * 0.3 + params.homeworkCompletion * 0.2
  );

  let label: string;
  if (finalScore >= 90) label = 'Excellent';
  else if (finalScore >= 75) label = 'Good';
  else if (finalScore >= 60) label = 'Needs Practice';
  else label = 'Needs Attention';

  return { finalScore, label };
}
