## Wymagania

- Docker + Docker Compose v2 (`docker compose`, nie `docker-compose`).
- Wolny port `9092` lokalnie (Kafka).
- Do pracy lokalnej nad testami (poza Dockerem): Node.js 20+.

## Uruchomienie środowiska

```bash
# Zbuduj obrazy i uruchom Kafkę + inicjalizację topiców + konsumenta
docker compose up --build -d

# Sprawdź logi konsumenta (powinien czekać na wiadomości)
docker compose logs -f consumer
```

## Ręczna demonstracja działania aplikacji (opcjonalnie, nie jest wymagane do zadania)

```bash
docker compose --profile demo run --rm producer
docker compose logs -f consumer
```

## Uruchomienie testów (tu pracujesz)

```bash
docker compose --profile test run --rm tests
```

Na start wszystkie testy w `tests/__tests__/kafkaFlow.test.ts` są oznaczone
`it.skip(...)` — po zaimplementowaniu każdego testu zamień `it.skip` na `it`.

### Uruchomienie testów lokalnie (bez Dockera dla samych testów)

Przydatne przy pisaniu/debugowaniu — szybszy cykl niż przebudowa obrazu Dockera:

```bash
cd tests
npm install
KAFKA_BOOTSTRAP_SERVERS=localhost:9092 npm test
```

Sprawdzenie typów bez uruchamiania testów:

```bash
cd tests
npx tsc --noEmit
```

## Zatrzymanie i sprzątanie środowiska

```bash
docker compose down -v
```

(`-v` czyści też dane Kafki — przydatne, gdy chcesz zacząć testy od zera).


---

## Twoje notatki (uzupełnij przed oddaniem zadania)

### Uwagi do uruchomienia
Podczas pracy dostosowałam konfigurację uruchamiania testów do środowiska Docker Compose. Testy są uruchamiane w osobnym kontenerze i komunikują się z Kafką przez adres brokera dostępny wewnątrz sieci Docker.

Finalne uruchomienie testów:
```bash
docker compose --profile test run --rm --build tests
```
### Podejście do testowania
Testy zostały przygotowane jako testy E2E sprawdzające cały przepływ wiadomości przez Kafkę. Pokryłam poprawne zamówienie oraz błędne dane: brak pola, nieprawidłowy typ i niepoprawny JSON.
Dodatkowo poprawiłam helpery Kafka, aby konsument był poprawnie zatrzymywany i rozłączany po zakończeniu testu, co zapobiegało zawieszaniu się testów. Wykorzystałam unikalne grupy konsumentów oraz fromBeginning: true, dzięki czemu testy są od siebie niezależne.

### Znane ograniczenia / co zrobiłbym/zrobiłabym inaczej mając więcej czasu
- Testy opierają się na obecnym formacie wiadomości oraz komunikatach błędów generowanych przez consumer.
- Można byłoby dodatkowo zweryfikować, że błędne zamówienie nie trafia jednocześnie do orders-processed.
- Można byłoby przygotować dodatkowy helper oczekujący na gotowość consumera, zamiast stosowanego obecnie krótkiego oczekiwania przed wysłaniem wiadomości.
