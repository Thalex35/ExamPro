import logo from "@/assets/exampro-logo.png.asset.json";
import icon from "@/assets/exampro-icon.png.asset.json";

export function BrandLogo({ className = "h-10" }: { className?: string }) {
  return <img src={logo.url} alt="EXAMPRO" className={`${className} w-auto object-contain`} />;
}

export function BrandIcon({ className = "h-9 w-9" }: { className?: string }) {
  return <img src={icon.url} alt="EXAMPRO" className={`${className} object-contain`} />;
}
