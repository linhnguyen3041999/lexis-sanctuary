function getVoicesWhenReady(synthesis: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const voices = synthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);

  return new Promise(resolve => {
    const finish = () => {
      window.clearTimeout(timeoutId);
      synthesis.removeEventListener("voiceschanged", finish);
      resolve(synthesis.getVoices());
    };
    const timeoutId = window.setTimeout(finish, 1000);
    synthesis.addEventListener("voiceschanged", finish, { once: true });
  });
}

export async function speakEnglish(text: string, onFinish: () => void): Promise<void> {
  if (!("speechSynthesis" in window)) {
    throw new Error("Speech synthesis is not supported in this browser.");
  }

  const synthesis = window.speechSynthesis;
  synthesis.cancel();

  const voices = await getVoicesWhenReady(synthesis);
  const utterance = new SpeechSynthesisUtterance(`, ${text.trim()}`);
  utterance.lang = "en-US";
  utterance.rate = 0.8;
  utterance.voice =
    voices.find(voice => voice.lang.toLowerCase().startsWith("en-us")) ??
    voices.find(voice => voice.lang.toLowerCase().startsWith("en")) ??
    null;
  utterance.onend = onFinish;
  utterance.onerror = event => {
    console.error("Speech synthesis error:", event.error);
    onFinish();
  };

  synthesis.speak(utterance);
  synthesis.resume();
}
