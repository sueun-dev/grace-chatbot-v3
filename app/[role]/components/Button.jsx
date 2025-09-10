import React from "react";

const Button = ({
  children,
  onClick = () => {},
  type = "button",
  className = "",
  disabled = false,
  isActive = true,
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`w-fit py-[11px] px-[22px] ${
        isActive
          ? "btn-linear-gradient text-white btn-shadow"
          : "text-[#666F8D]"
      } rounded-[8px] font-medium text-[16px] leading-[120%] cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-300 ease-in-out ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
