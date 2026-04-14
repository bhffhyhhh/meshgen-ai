import Layout from "@/components/Layout";
import ChatPage from "@/pages/ChatPage";
import { useEffect } from "react";

export default function App() {
  // Force dark mode always — Iron Man HUD is designed for dark theme only
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <Layout>
      <ChatPage />
    </Layout>
  );
}
