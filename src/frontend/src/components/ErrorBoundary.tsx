import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    // Ensure dark class stays on so the HUD theme persists
    document.documentElement.classList.add("dark");
    return { hasError: true, errorMessage: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[MeshGen AI] Unhandled error:", error, info.componentStack);
    document.documentElement.classList.add("dark");
  }

  handleReboot = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center bg-[#030712] text-center px-6"
          data-ocid="error-boundary-fallback"
        >
          {/* Decorative ring */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border-2 border-amber-400/40 flex items-center justify-center animate-pulse">
              <div className="w-16 h-16 rounded-full border border-amber-400/60 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-8 h-8 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-label="Warning"
                  role="img"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-400/60 mb-3">
            MeshGen AI — Critical Fault
          </p>
          <h1 className="text-3xl font-bold text-amber-400 mb-3 tracking-wide">
            SYSTEM ERROR
          </h1>
          <p className="text-sm font-mono text-amber-200/50 mb-2 max-w-sm">
            An unhandled exception has disrupted the neural interface.
          </p>
          {this.state.errorMessage && (
            <p className="text-xs font-mono text-red-400/60 mb-8 max-w-md break-words border border-red-500/20 rounded px-3 py-2 bg-red-950/20">
              {this.state.errorMessage}
            </p>
          )}

          {/* Reboot button */}
          <button
            onClick={this.handleReboot}
            type="button"
            data-ocid="error-reboot-btn"
            className="px-8 py-3 text-sm font-mono tracking-widest uppercase border border-amber-400/50 text-amber-400 rounded hover:bg-amber-400/10 hover:border-amber-400 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
          >
            ⟳ Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
