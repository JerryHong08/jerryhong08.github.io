import { MainPage } from "./components/MainPage";
import { ThemeProvider } from "next-themes";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <MainPage />
    </ThemeProvider>
  );
}