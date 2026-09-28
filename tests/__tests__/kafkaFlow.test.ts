/**
 * TWOJE ZADANIE: zaimplementuj testy.
 *
 * Aplikacja (producer + consumer) jest już gotowa i działająca — Twoim
 * zadaniem jest napisanie testów E2E weryfikujących jej zachowanie,
 *
 * Masz do dyspozycji gotowe helpery z `src/kafkaHelpers.ts` (opisane
 * w komentarzach tego pliku) — możesz z nich korzystać, ale nie musisz:
 * jeśli uważasz, że lepiej napisać coś inaczej, zrób to i uzasadnij w README.
 *
 */
import { Producer } from "kafkajs";
import {
  ORDERS_DLQ_TOPIC,
  ORDERS_PROCESSED_TOPIC,
  Order,
  collectMessages,
  disconnectProducer,
  getProducer,
  makeTestOrder,
  sendOrder,
  sendRaw,
  waitForMessage,
} from "../src/kafkaHelpers";

describe("Przepływ przetwarzania zamówień przez Kafkę", () => {
  let producer: Producer;

  beforeAll(async () => {
    producer = await getProducer();
  });

  afterAll(async () => {
    await disconnectProducer();
  });

  it("przetwarza poprawne zamówienie", async () => {
    const order = makeTestOrder();

    const resultsPromise = collectMessages(
      ORDERS_PROCESSED_TOPIC,
      (message) => message.orderId === order.orderId,
      1
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await sendOrder(producer, order);

    const results = await resultsPromise;

    expect(results).toHaveLength(1);

    const result = results[0];

    expect(result.orderId).toBe(order.orderId);
    expect(result.customer).toBe(order.customer);
    expect(result.amount).toBe(order.amount);
    expect(result.status).toBe("PROCESSED");
  });

  it("przenosi niepoprawne zamówienie do DLQ", async () => {
    const order = makeTestOrder();

    const invalidOrder: Partial<Order> = {
      orderId: order.orderId,
      amount: order.amount,
      status: order.status,
    };

    const resultPromise = waitForMessage(
      ORDERS_DLQ_TOPIC,
      (message) =>
        message.originalMessage?.orderId === order.orderId &&
        message.error?.includes("customer")
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await sendOrder(producer, invalidOrder);

    const result = await resultPromise;

    expect(result).not.toBeNull();
    expect(result.originalMessage.orderId).toBe(order.orderId);
    expect(result.error).toContain("customer");
  });

  it("przenosi zamówienie z nieprawidłowym typem pola do DLQ", async () => {
    const order = makeTestOrder();

    const invalidOrder = {
      ...order,
      amount: "123.45",
    } as unknown as Partial<Order>;

    const resultPromise = waitForMessage(
      ORDERS_DLQ_TOPIC,
      (message) =>
        message.originalMessage?.orderId === order.orderId &&
        message.error?.includes("amount") &&
        message.error?.includes("liczbą")
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await sendOrder(producer, invalidOrder);

    const result = await resultPromise;

    expect(result).not.toBeNull();
    expect(result.originalMessage.orderId).toBe(order.orderId);
    expect(result.originalMessage.amount).toBe("123.45");
    expect(result.error).toContain("amount");
    expect(result.error).toContain("liczbą");
  });

  it("przenosi niepoprawny JSON do DLQ", async () => {
    const rawMessage = '{"orderId":"invalid-json",';

    const resultPromise = waitForMessage(
      ORDERS_DLQ_TOPIC,
      (message) =>
        message.error?.includes("Niepoprawny JSON") &&
        message.raw === rawMessage
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await sendRaw(producer, rawMessage, "invalid-json");

    const result = await resultPromise;

    expect(result).not.toBeNull();
    expect(result.error).toContain("Niepoprawny JSON");
    expect(result.raw).toBe(rawMessage);
  });
});