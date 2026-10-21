"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return <span className="password-input-wrap">
    <input {...props} className={["password-input-field", className].filter(Boolean).join(" ")} type={visible ? "text" : "password"} />
    <button
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      className="password-input-toggle"
      onClick={() => setVisible((current) => !current)}
      type="button"
    >
      {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
    </button>
  </span>;
}
