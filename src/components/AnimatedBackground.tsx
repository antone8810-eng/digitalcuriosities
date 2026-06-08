export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-app">
      <div className="absolute -top-32 -left-20 size-[420px] rounded-full bg-gradient-primary opacity-30 blur-3xl animate-float-orb" />
      <div className="absolute top-1/3 -right-24 size-[380px] rounded-full bg-gradient-accent opacity-30 blur-3xl animate-float-orb" style={{ animationDelay: "-4s" }} />
      <div className="absolute bottom-0 left-1/3 size-[460px] rounded-full bg-gradient-primary opacity-25 blur-3xl animate-float-orb" style={{ animationDelay: "-8s" }} />
    </div>
  );
}
