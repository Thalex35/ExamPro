import logo from "@/assets/ExamPro Graduation Cap Logo.png";
import icon from "@/assets/Logo de casquette et livres empilés.png";

export function BrandLogo({ className = "h-10" }: { className?: string }) {
  return <img src={logo} alt="EXAMPRO" className={`${className} w-auto object-contain`} />;
}

export function BrandIcon({ className = "h-9 w-9" }: { className?: string }) {
  return <img src={icon} alt="EXAMPRO" className={`${className} object-contain`} />;
}
