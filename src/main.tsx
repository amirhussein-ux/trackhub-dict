import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const TEST_RESET_MARKER_KEY = "trackhub.test-reset.v1";
const TEST_DATA_KEYS = [
	"trackhub.policies",
	"trackhub.documents",
	"trackhub.activities",
	"trackhub.notifications",
];

try {
	if (!window.localStorage.getItem(TEST_RESET_MARKER_KEY)) {
		TEST_DATA_KEYS.forEach((key) => window.localStorage.removeItem(key));
		window.localStorage.setItem(TEST_RESET_MARKER_KEY, "done");
	}
} catch {
	// Ignore storage access failures and continue app boot.
}

createRoot(document.getElementById("root")!).render(<App />);
