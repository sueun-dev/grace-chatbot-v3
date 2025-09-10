import React from "react";
import Image from "next/image";

const Logo = () => {
  return (
    <div className="p-[6px] bg-white rounded-[6px] w-[90px] h-[30px]">
      <Image src={"/logo.svg"} width={182} height={40} alt="logo" />
    </div>
  );
};

export default Logo;
