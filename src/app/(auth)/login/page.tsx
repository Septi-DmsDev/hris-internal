import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">HRIS Internal</h1>
          <p className="text-sm text-slate-500">Masuk ke dashboard HR</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
