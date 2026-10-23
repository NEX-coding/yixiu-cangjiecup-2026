"use client";

type Props = {
  siteName?: string;
};

export function CopyrightFooter({ siteName = "衣秀" }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="copyright-footer">
      <div className="copyright-footer-inner">
        <span className="copyright-copy">
          © {year} {siteName} · 仓颉杯竞赛演示
        </span>
      </div>
    </footer>
  );
}
