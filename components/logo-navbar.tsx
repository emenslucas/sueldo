"use client";
import { useTheme } from "next-themes";

export function LogoNavbar(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? "/logo_light.svg" : "/logo_dark.svg";
  return <img src={src} alt="Logo GS" className="h-8 w-8 rounded" {...props} />;
}
