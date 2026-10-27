interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-stone-900 tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-stone-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
