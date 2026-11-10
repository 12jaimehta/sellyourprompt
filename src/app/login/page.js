import AuthForm from "@/components/AuthForm";

export default async function LoginPage({ searchParams }) {
  const { next = "/dashboard" } = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-20">
      <AuthForm next={next.startsWith("/") ? next : "/dashboard"} />
    </div>
  );
}
