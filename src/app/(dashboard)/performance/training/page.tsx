import { getTrainingEvaluations } from "@/server/actions/training";
import TrainingEvaluationClient from "./TrainingEvaluationClient";

export default async function TrainingEvaluationPage() {
  const data = await getTrainingEvaluations();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Training Evaluation</h1>
        <p className="text-sm text-slate-500">
          Evaluasi kelulusan karyawan training berdasarkan persentase kinerja poin per divisi.
        </p>
      </div>
      <TrainingEvaluationClient role={data.role} evaluations={data.evaluations} />
    </div>
  );
}
