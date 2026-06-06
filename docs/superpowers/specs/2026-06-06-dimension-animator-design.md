# After Effects Dimension Animator Design

## Cel

Zbudować osobny, dokowalny panel ScriptUI dla After Effects, który tworzy **wymiarówkę / wskaźnik wysokości** między dwoma nullami: linię z grotem strzałki, widoczny punkt startowy oraz etykietę z wartością liczbową. Wartość może być animowana — płynnie odliczana od wartości startowej do końcowej, albo zmieniana skokowo w wybranym momencie.

Narzędzie jest siostrzane wobec istniejącego `Ruler Animator` i celowo NIE modyfikuje jego plików. Powiela sprawdzone wzorce (rig na nullach, sterowanie wyrażeniami z kontrolera, presety JSON, testy statyczne).

## Platforma

Cross‑platformowy ExtendScript/ScriptUI (`.jsx`) instalowany do `Scripts/ScriptUI Panels`, dokładnie jak Ruler. Powód ten sam: narzędzie tworzy i steruje warstwami kompozycji, nie renderuje pikseli, i ma być używane wielokrotnie z regulacją.

## Pliki i pakowanie

- `src/DimensionAnimator.jsx` — panel.
- `src/dimensionAnimatorCore.js` — czyste funkcje (presety, formatowanie liczby, budowa wyrażeń), testowalne w Node.
- `tests/dimensionAnimatorCore.test.js`
- `tests/dimensionAnimatorPanel.static.test.js`
- `scripts/install-after-effects.js` — rozszerzony tak, by kopiował również dwa nowe pliki obok plików Rulera.

Tytuł panelu: `Dimension Animator`. Prefiks rigów: `Dim_NN_` (auto‑inkrementacja jak `Ruler_NN_`).

## Zachowanie rdzeniowe

Panel tworzy w aktywnej kompozycji rig wymiarówki:

- `Dim_NN_Controller` — null (shy, wyłączony) z efektami sterującymi.
- `Dim_NN_Start` — null pozycji startu; w tym miejscu rysowany jest **widoczny punkt startowy** (wypełniona kropka).
- `Dim_NN_End` — null pozycji końca.
- `Dim_NN_Line` — warstwa kształtu: linia Start→End **z grotem strzałki przy End**.
- `Dim_NN_Label` — warstwa tekstu z wartością.

### Strzałka śledzi End na żywo

Ścieżka linii oraz orientacja i pozycja grotu są liczone wyrażeniami z pozycji nullów `Start`/`End`. Przesunięcie nulla `End` (lub `Start`) natychmiast aktualizuje linię i grot — bez przebudowy rigu. Linia jest zawsze pełna (Start→End); **brak podziału na części i brak animowanego reveal** linii. Geometria nie jest animowana w czasie — animowana jest tylko wartość liczbowa.

## Animacja wartości

Użytkownik wpisuje na sztywno wartości skrajne, np. **Start = 64**, **End = 84**, jednostkę (np. ` cm`) oraz liczbę miejsc po przecinku (`Decimals`). Okno czasu `t0..t1` pochodzi z timingu (jak w rulerze: Fit To Comp albo zakres klatek Start/End Frame).

Zachowanie zależy od przełącznika **Count (odliczanie)**:

- **Odliczanie WŁĄCZONE** — płynne liczenie:
  `v = linear(time, t0, t1, startValue, endValue)`, tekst = `format(v, decimals) + unit`.
  Przed `t0` widać `startValue`, po `t1` — `endValue` (`linear` klampuje poza zakresem).
- **Odliczanie WYŁĄCZONE** — skokowo:
  do momentu `Jump At` widać `startValue`, po nim — `endValue`. To realizuje przypadek „80 → 90": widoczna tylko wartość startowa, a w odpowiednim momencie pojawia się końcowa.

`Jump At` jest wyrażony jako **procent okna** `t0..t1` (0–100%); moment skoku = `t0 + (t1 - t0) * jumpAt/100`. Używany tylko gdy odliczanie jest wyłączone.

### Co jest suwakiem, a co wpalone w wyrażenie

- Suwaki/efekty na kontrolerze (regulowalne na żywo): `Start Value`, `End Value`, `Decimals`, `Jump At`, `Count` (checkbox), oraz timing `Fit To Comp`, `Start Frame`, `End Frame`, plus styl (`Line Width`, `Point Size`, `Arrow Size`, `Label Offset X`, `Label Offset Y`).
- Wpalane jako literał w generowane wyrażenie przy tworzeniu/aktualizacji: **jednostka** (`unit`, np. `" cm"`), bo nie da się jej trzymać na suwaku. Zmiana jednostki wymaga „Update Selected" (przebudowa rigu), tak jak inne zmiany strukturalne w rulerze.

## Panel — kontrolki

**Wartości**
- `Start value` (liczba)
- `End value` (liczba)
- `Unit` (tekst, np. ` cm`)
- `Decimals` (liczba, 0–3)
- ☑ `Count up` (odliczanie)
- `Jump at (%)` (liczba 0–100; aktywne gdy `Count up` wyłączone)

**Timing** (model jak w rulerze)
- ☑ `Fit animation to composition`
- `Start frame` / `End frame` (używane, gdy nie „fit")

**Wygląd**
- `Line color`, `Line width`
- `Start point size`
- `Arrow size`
- Tekst: `Font`, `Text align`, `Text direction`, `Text color`, `Text size`, `Text X offset`, `Text Y offset`

**Akcje**
- `Create Dimension`
- `Update Selected` — przebudowuje wybrany rig z aktualnych ustawień panelu, zachowując pozycje nullów `Start`/`End`.
- `Save Preset` / `Load Preset` — JSON, jak w rulerze (osobny typ presetu: `dimension-animator-preset`).

## Architektura kodu

Wzorowana 1:1 na rulerze, z zachowaniem rozdziału panel ↔ core:

- `dimensionAnimatorCore.js` eksportuje m.in.:
  - `parseHexColor`, `pad2`, `nextPrefix` (współdzielony kształt; własna kopia, by panele były niezależne),
  - `formatValue(value, decimals)` — czyste formatowanie liczby,
  - `buildValueExpression({ prefix, unit })` — zwraca tekst wyrażenia Source Text (testowalny w Node przez string‑match i ewaluację z podstawionym `linear`/`time`/`thisComp`),
  - `serializePreset` / `deserializePreset` + `PRESET_KEYS` / `PRESET_DEFAULTS` dla nowego zestawu pól,
  - `validateSettings` — m.in. wymóg sensownego okna klatek gdy nie „fit", `Decimals >= 0`, `Jump At` w 0–100.
- `DimensionAnimator.jsx` buduje panel, czyta ustawienia, tworzy rig, podpina wyrażenia.

## Wyrażenia (zarys)

- **Ścieżka linii** (`Dim_NN_Line`): z pozycji `Start`/`End` buduje `createPath` dwupunktowy; grot jako osobna mała grupa kształtu obrócona o `atan2(e-s)` i osadzona przy `End` (rozmiar z `Arrow Size`).
- **Punkt startowy**: elipsa o rozmiarze `Point Size` w pozycji `Start`, zawsze widoczna.
- **Source Text etykiety**: wyrażenie wg sekcji „Animacja wartości" — gałąź `Count` decyduje między `linear(...)` a skokiem `time < jump ? sv : ev`, wynik formatowany do `Decimals` miejsc i sklejony z `unit`.
- **Pozycja etykiety**: punkt środkowy linii (lub przy `End`) + `[Label Offset X, Label Offset Y]`, jak w rulerze.

## Testy

- **core**: round‑trip presetów (każde pole), odrzucenie nie‑JSON i obcego typu, `formatValue` dla 0–3 miejsc i wartości ujemnych, ewaluacja `buildValueExpression` w Node dla trybu płynnego (kilka punktów `time`) i skokowego (przed/po `jump`).
- **panel static**: obecność przycisków `Create Dimension` / `Update Selected` / `Save`/`Load`; podpięcie wyrażeń (`Source Text`, ścieżka linii, grot), sterowanie przez suwaki kontrolera, brak martwych efektów, spójne kolory/shy.
- Wcześniejsze testy Rulera pozostają nietknięte.

## Poza zakresem (YAGNI)

- Brak podziału na części / etykiet pośrednich (to ma Ruler).
- Brak animacji długości linii / reveal.
- Brak automatycznego wyliczania wartości z odległości pikselowej — wartości są wpisywane na sztywno.
- Brak wielu jednostek naraz / konwersji jednostek.
