import React from "react";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <section className="flex h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md">{children}</div>
    </section>
  );
};

export default AuthLayout;