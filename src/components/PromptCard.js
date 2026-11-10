import Link from "next/link";
import { money } from "@/lib/format";

export default function PromptCard({ prompt }) {
  return (
    <Link
      href={`/prompt/${prompt.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-neutral-100 bg-neutral-100">
        {prompt.preview_image_url ? (
          <img
            src={prompt.preview_image_url}
            alt={prompt.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <p className="line-clamp-[8] h-full p-4 text-xs leading-relaxed text-neutral-600">
            {prompt.preview_output || "No preview yet."}
          </p>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
          {prompt.model}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-medium leading-snug">{prompt.title}</h3>
        <div className="mt-auto flex items-center justify-between text-sm">
          <span className="text-neutral-500">
            {prompt.sales_count} {prompt.sales_count === 1 ? "sale" : "sales"}
          </span>
          <span className="font-semibold">{money(prompt.price_cents)}</span>
        </div>
      </div>
    </Link>
  );
}
