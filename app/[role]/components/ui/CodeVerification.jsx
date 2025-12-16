import Button from "@/app/[role]/components/Button";
import React from "react";

const CodeVerification = ({ handleFormSubmit }) => {
  return (
    <div className="h-screen w-full max-w-[700px] mx-auto pt-[100px]">
      <form className="flex flex-col gap-4" onSubmit={handleFormSubmit}>
        <label
          htmlFor="codeVerification"
          className="text-[24px] font-semibold text-black leading-[120%] tracking-0"
        >
          Section Code Verification
        </label>
        <input
          type="text"
          name="codeVerification"
          id="codeVerification"
          placeholder="Enter 6-character code"
          className="border-2 border-gray-300 rounded-md p-4"
        />
        <Button type="submit" className="w-full">
          Verify
        </Button>
      </form>
    </div>
  );
};

export default CodeVerification;
