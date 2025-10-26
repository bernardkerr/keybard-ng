import MainScreen from "./components/MainScreen";
import { KeyBindingProvider } from "./contexts/KeyBindingContext";
import { VialProvider } from "./contexts/VialContext";

function App() {
    return (
        <VialProvider>
            <KeyBindingProvider>
                <MainScreen />
            </KeyBindingProvider>
        </VialProvider>
    );
}

export default App;
