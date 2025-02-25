import Mellowtel from "mellowtel";

(async () => {
    const MELLOWTEL_API_KEY = import.meta.env.VITE_MELLOWTEL_API_KEY;
    const mellowtel = new Mellowtel(atob(MELLOWTEL_API_KEY));
    await mellowtel.initPascoli();
})();