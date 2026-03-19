"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "vera";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "vera",
      content:
        "Hola! Soy Vera, tu asistente de ventas con IA. Puedo ayudarte a conocer los productos de nuestros negocios aliados. Escribe tu consulta!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date() },
    ]);
    setLoading(true);

    try {
      const res = await api.chatWithVera(
        userMessage,
        `Negocio: Menta Organika — Repostería artesanal y productos orgánicos en Lima, Perú.

Horario: Lunes a Domingo 9AM-9PM (incluido feriados).

Delivery: S/10.00 tarifa fija. Zonas: Los Olivos, Independencia, San Martín de Porres (SMP). Tiempo: 40-60 min. Fuera de zona: sugerir recojo en tienda.

Pago: Solo Yape. No efectivo, no transferencias, no tarjetas.

Catálogo:
1. Torta de Chocolate Orgánico - S/65.00 (8 porciones, cacao orgánico, sin harina refinada)
2. Brownies Orgánicos caja x6 - S/28.00 (sin gluten, cacao orgánico y aceite de coco)
3. Galletas de Avena y Pasas docena - S/18.00 (avena integral, pasas orgánicas, miel)
4. Cheesecake de Maracuyá - S/72.00 (8 porciones, queso artesanal, coulis de maracuyá)
5. Cúrcuma en Polvo Orgánica 100g - S/15.00 (para infusiones, golden milk)
6. Aceite de Coco Extra Virgen 250ml - S/22.00 (prensado en frío, cocina y cosmético)
7. Granola Artesanal con Frutos Secos 300g - S/20.00 (sin azúcar añadida)
8. Muffins Integrales de Arándano caja x4 - S/16.00 (harina integral, arándanos frescos)
9. Alfajores de Manjar Orgánico caja x6 - S/24.00 (maicena, manjar blanco artesanal)
10. Golden Milk Mix 150g - S/25.00 (cúrcuma, canela, jengibre, pimienta — rinde 15 tazas)

Reglas: Confirmar zona de delivery antes de tomar pedido. Si pide 2+ productos, ofrecer envío gratis. Si preguntan por algo fuera del catálogo, recomendar similar. Recordar que pago es solo Yape.`
      );
      setMessages((prev) => [
        ...prev,
        { role: "vera", content: res.reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "vera",
          content: "Lo siento, hubo un error. Intenta de nuevo.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Chat con Vera</h1>
        <p className="text-gray-500 text-sm mt-1">
          Asistente de ventas IA - Menta Organika
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 flex flex-col" style={{ height: "65vh" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                }`}
              >
                {msg.role === "vera" && (
                  <p className="text-xs font-semibold text-primary mb-1">Vera</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === "user" ? "text-indigo-200" : "text-gray-400"}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-xs font-semibold text-primary mb-1">Vera</p>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-gray-200 p-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
