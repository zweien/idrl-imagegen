import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return (
    <>
      <header className="shrink-0 border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <a href="/" className="text-lg font-bold">
            IDRL ImageGen
          </a>
          <nav className="ml-auto flex gap-4">
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              生图
            </a>
            <a
              href="/history"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              历史
            </a>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-bold">生成历史</h1>
        <HistoryList />
      </div>
    </>
  );
}
