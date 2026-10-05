import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Building2,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/integrations/supabase/client";
import { askAssistant } from "@/lib/assistant.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      {
        title: "Ask cityhealth | Healthcare, Made Clear",
      },
      {
        name: "description",
        content:
          "Ask cityhealth for health information, doctor recommendations and nearby hospitals.",
      },
    ],
  }),

  component: AssistantPage,
});

type DoctorResult = {
  id: string;
  slug: string | null;
  name: string;
  specialty: string;
  hospital: string;
  qualification: string | null;
  experience_years: number | null;
  rating: number | null;
  reviews_count: number | null;
  fee: number | null;
};

type HospitalResult = {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  address: string | null;
  rating: number | null;
  reviews_count: number | null;
  emergency: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;

  doctors?: DoctorResult[];
  hospitals?: HospitalResult[];
  clarificationOptions?: string[];
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

const suggestions = [
  "Which doctor should I see for frequent headaches?",
  "My stomach burns after eating, which doctor should I see?",
  "Which hospital is best near me?",
  "I have a skin problem but I don't know which doctor I need.",
];

function AssistantPage() {
  return (
    <AuthGate title="Sign in to use cityhealth">
      <Assistant />
    </AuthGate>
  );
}

function Assistant() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);

  const [activeId, setActiveId] = useState<string | null>(
    null,
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (item) => item.id === activeId,
      ) ?? null,
    [conversations, activeId],
  );

  // ---------------------------------------------------------
  // Get browser location
  // ---------------------------------------------------------

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // User can deny location.
        // AI will still work without it.
        console.log("Location permission was not granted.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, []);

  // ---------------------------------------------------------
  // Load conversations
  // ---------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    void loadConversations();
  }, [user]);

  async function loadConversations(
    preferredId?: string,
  ) {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("chat_conversations")
      .select(
        "id,title,created_at,updated_at",
      )
      .eq("user_id", user.id)
      .order("updated_at", {
        ascending: false,
      });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const list = (data ?? []) as Conversation[];

    setConversations(list);

    const nextId =
      preferredId ??
      activeId ??
      list[0]?.id;

    if (nextId) {
      setActiveId(nextId);
      await loadMessages(nextId);
    } else {
      await createConversation();
    }
  }

  // ---------------------------------------------------------
  // Create conversation
  // ---------------------------------------------------------

  async function createConversation() {
    if (!user) return null;

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: user.id,
        title: "New conversation",
      })
      .select(
        "id,title,created_at,updated_at",
      )
      .single();

    if (error) {
      toast.error(error.message);
      return null;
    }

    const conversation =
      data as Conversation;

    setConversations((current) => [
      conversation,
      ...current,
    ]);

    setActiveId(conversation.id);
    setMessages([]);

    return conversation.id;
  }

  // ---------------------------------------------------------
  // Load messages
  // ---------------------------------------------------------

  async function loadMessages(
    conversationId: string,
  ) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(
        "id,role,content,metadata,created_at",
      )
      .eq(
        "conversation_id",
        conversationId,
      )
      .eq(
        "user_id",
        user?.id ?? "",
      )
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      toast.error(error.message);
      return;
    }

    setMessages(
      (data ?? []).map((message: any) => ({
        id: message.id,

        role: message.role,

        content: message.content,

        created_at: message.created_at,

        doctors:
          message.metadata?.doctors ?? [],

        hospitals:
          message.metadata?.hospitals ?? [],

        clarificationOptions:
          message.metadata
            ?.clarificationOptions ?? [],
      })),
    );
  }

  // ---------------------------------------------------------
  // Select conversation
  // ---------------------------------------------------------

  async function selectConversation(
    id: string,
  ) {
    setActiveId(id);

    await loadMessages(id);
  }

  // ---------------------------------------------------------
  // Delete conversation
  // ---------------------------------------------------------

  async function deleteConversation(
    id: string,
  ) {
    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    const next =
      conversations.filter(
        (item) => item.id !== id,
      );

    setConversations(next);

    if (id === activeId) {
      if (next[0]) {
        await selectConversation(
          next[0].id,
        );
      } else {
        await createConversation();
      }
    }
  }

  // ---------------------------------------------------------
  // Send message
  // ---------------------------------------------------------

  async function sendMessage(
    event?: React.FormEvent,
  ) {
    event?.preventDefault();

    const message = input.trim();

    if (
      !message ||
      sending ||
      !user
    ) {
      return;
    }

    let conversationId = activeId;

    if (!conversationId) {
      conversationId =
        await createConversation();
    }

    if (!conversationId) {
      return;
    }

    setInput("");
    setSending(true);

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      created_at:
        new Date().toISOString(),
    };

    setMessages((current) => [
      ...current,
      optimistic,
    ]);

    try {
      const history = messages
        .slice(-20)
        .map(({ role, content }) => ({
          role,
          content,
        }));

      const result =
        await askAssistant({
          data: {
            conversationId,
            userId: user.id,
            message,
            history,

            ...(location
              ? {
                latitude:
                  location.latitude,
                longitude:
                  location.longitude,
              }
              : {}),
          },
        });

      const assistantMessage: ChatMessage =
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.reply,
        created_at:
          new Date().toISOString(),

        doctors:
          result.doctors ?? [],

        hospitals:
          result.hospitals ?? [],

        clarificationOptions:
          result.clarificationOptions ??
          [],
      };

      setMessages((current) => [
        ...current.filter(
          (item) =>
            item.id !== optimistic.id,
        ),
        optimistic,
        assistantMessage,
      ]);

      // Set conversation title
      if (messages.length === 0) {
        const title =
          message.length > 48
            ? `${message.slice(0, 48)}…`
            : message;

        await supabase
          .from("chat_conversations")
          .update({
            title,
          })
          .eq(
            "id",
            conversationId,
          )
          .eq(
            "user_id",
            user.id,
          );

        setConversations(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                  conversationId
                  ? {
                    ...item,
                    title,
                    updated_at:
                      new Date().toISOString(),
                  }
                  : item,
            ),
        );
      }
    } catch (error) {
      setMessages((current) =>
        current.filter(
          (item) =>
            item.id !==
            optimistic.id,
        ),
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "The assistant could not answer just now.",
      );
    } finally {
      setSending(false);
    }
  }

  // ---------------------------------------------------------
  // Use clarification option
  // ---------------------------------------------------------

  function useClarification(
    option: string,
  ) {
    setInput(option);
  }

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div className="bg-muted/20">
      {/* Header */}

      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-mint-foreground">
                <Sparkles className="size-3.5" />
                cityhealth
              </div>

              <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">
                Ask AI about your next step in care.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Describe your health concern in your
                own words. You do not need to know the
                medical term.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Your chats are tied to your account.
            </div>
          </div>
        </div>
      </section>

      {/* Main */}

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        {/* Sidebar */}

        <aside className="hidden rounded-xl border bg-card p-3 shadow-card lg:block">
          <Button
            className="w-full justify-start"
            onClick={() =>
              void createConversation()
            }
          >
            <Plus />
            New conversation
          </Button>

          <div className="mt-4 space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : conversations.length ===
              0 ? (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                No conversations yet.
              </p>
            ) : (
              conversations.map(
                (conversation) => (
                  <div
                    key={
                      conversation.id
                    }
                    className={`group flex items-center gap-1 rounded-lg ${activeId ===
                      conversation.id
                      ? "bg-mint"
                      : "hover:bg-muted"
                      }`}
                  >
                    <button
                      onClick={() =>
                        void selectConversation(
                          conversation.id,
                        )
                      }
                      className="min-w-0 flex-1 px-3 py-3 text-left text-sm font-medium"
                    >
                      <span className="block truncate">
                        {
                          conversation.title
                        }
                      </span>

                      <span className="mt-1 flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                        <Clock3 className="size-3" />

                        {new Date(
                          conversation.updated_at,
                        ).toLocaleDateString()}
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        void deleteConversation(
                          conversation.id,
                        )
                      }
                      aria-label="Delete conversation"
                      className="mr-2 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ),
              )
            )}
          </div>
        </aside>

        {/* Chat */}

        <section className="flex min-h-[680px] flex-col overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-5" />
              </div>

              <div>
                <p className="font-semibold text-navy">
                  {activeConversation?.title ??
                    "cityhealth"}
                </p>

                <p className="text-xs text-muted-foreground">
                  Health guidance · doctor & hospital
                  discovery · not a diagnosis
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() =>
                void createConversation()
              }
            >
              <Plus />
              New
            </Button>
          </div>

          {/* Messages */}

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            {messages.length === 0 ? (
              <div className="mx-auto max-w-2xl py-12 text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-mint text-primary">
                  <MessageCircle className="size-7" />
                </div>

                <h2 className="mt-5 font-display text-2xl font-bold text-navy">
                  How can I help?
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Tell me what you are experiencing in
                  your own words.
                </p>

                <div className="mt-7 grid gap-2 text-left sm:grid-cols-2">
                  {suggestions.map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() =>
                          setInput(
                            suggestion,
                          )
                        }
                        className="rounded-lg border p-4 text-sm font-medium transition hover:border-primary hover:bg-mint/40"
                      >
                        <span>
                          {suggestion}
                        </span>

                        <ChevronRight className="float-right mt-0.5 size-4 text-muted-foreground" />
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-5">
                {messages.map(
                  (message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role ===
                        "user"
                        ? "justify-end"
                        : "justify-start"
                        }`}
                    >
                      <div
                        className={`flex max-w-[92%] gap-3 ${message.role ===
                          "user"
                          ? "flex-row-reverse"
                          : ""
                          }`}
                      >
                        {/* Avatar */}

                        <div
                          className={`grid size-8 shrink-0 place-items-center rounded-full ${message.role ===
                            "user"
                            ? "bg-navy text-white"
                            : "bg-primary/10 text-primary"
                            }`}
                        >
                          {message.role ===
                            "user" ? (
                            <UserRound className="size-4" />
                          ) : (
                            <Bot className="size-4" />
                          )}
                        </div>

                        {/* Message */}

                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.role ===
                            "user"
                            ? "bg-navy text-white"
                            : "border bg-background text-foreground"
                            }`}
                        >
                          <p className="whitespace-pre-wrap">
                            {
                              message.content
                            }
                          </p>

                          {/* Clarification */}

                          {message
                            .clarificationOptions &&
                            message
                              .clarificationOptions
                              .length >
                            0 && (
                              <div className="mt-4 space-y-2">
                                <p className="font-semibold text-navy">
                                  Choose what is closest:
                                </p>

                                {message.clarificationOptions.map(
                                  (
                                    option,
                                  ) => (
                                    <button
                                      key={
                                        option
                                      }
                                      type="button"
                                      onClick={() =>
                                        useClarification(
                                          option,
                                        )
                                      }
                                      className="flex w-full items-center justify-between rounded-lg border bg-background p-3 text-left text-sm font-medium transition hover:border-primary hover:bg-mint/40"
                                    >
                                      <span>
                                        {
                                          option
                                        }
                                      </span>

                                      <ChevronRight className="size-4 text-muted-foreground" />
                                    </button>
                                  ),
                                )}
                              </div>
                            )}

                          {/* Doctors */}

                          {message
                            .doctors &&
                            message
                              .doctors
                              .length >
                            0 && (
                              <div className="mt-5 space-y-3">
                                <div className="flex items-center gap-2">
                                  <UserRound className="size-4 text-primary" />

                                  <p className="font-semibold text-navy">
                                    Recommended Doctors
                                  </p>
                                </div>

                                {message.doctors.map(
                                  (
                                    doctor,
                                  ) => (
                                    <div
                                      key={
                                        doctor.id
                                      }
                                      className="rounded-xl border bg-card p-4"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <h3 className="font-semibold text-navy">
                                            {
                                              doctor.name
                                            }
                                          </h3>

                                          <p className="text-sm text-primary">
                                            {
                                              doctor.specialty
                                            }
                                          </p>

                                          {doctor.qualification && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              {
                                                doctor.qualification
                                              }
                                            </p>
                                          )}
                                        </div>

                                        {doctor.rating !==
                                          null && (
                                            <span className="flex shrink-0 items-center gap-1 rounded-md bg-mint px-2 py-1 text-xs font-semibold">
                                              <Star className="size-3 fill-current" />

                                              {
                                                doctor.rating
                                              }
                                            </span>
                                          )}
                                      </div>

                                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                        {doctor.experience_years !==
                                          null && (
                                            <p>
                                              {
                                                doctor.experience_years
                                              }{" "}
                                              years
                                              experience
                                            </p>
                                          )}

                                        <p>
                                          <Building2 className="mr-1 inline size-3.5" />

                                          {
                                            doctor.hospital
                                          }
                                        </p>

                                        {doctor.reviews_count !==
                                          null && (
                                            <p>
                                              {
                                                doctor.reviews_count
                                              }{" "}
                                              patient
                                              reviews
                                            </p>
                                          )}

                                        {doctor.fee !==
                                          null && (
                                            <p>
                                              Consultation:
                                              ₹
                                              {
                                                doctor.fee
                                              }
                                            </p>
                                          )}
                                      </div>

                                      <div className="mt-4 flex flex-wrap gap-2">
                                        {doctor.slug && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              window.location.assign(
                                                `/doctors/${doctor.slug}`,
                                              );
                                            }}
                                          >
                                            View Profile
                                          </Button>
                                        )}

                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            window.location.assign(
                                              `/appointments?doctor=${doctor.id}`,
                                            );
                                          }}
                                        >
                                          Book Appointment
                                        </Button>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}

                          {/* Hospitals */}

                          {message
                            .hospitals &&
                            message
                              .hospitals
                              .length >
                            0 && (
                              <div className="mt-5 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Building2 className="size-4 text-primary" />

                                  <p className="font-semibold text-navy">
                                    Nearby Hospitals
                                  </p>
                                </div>

                                {message.hospitals.map(
                                  (
                                    hospital,
                                  ) => (
                                    <div
                                      key={
                                        hospital.id
                                      }
                                      className="rounded-xl border bg-card p-4"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <h3 className="font-semibold text-navy">
                                            {
                                              hospital.name
                                            }
                                          </h3>

                                          {hospital.city && (
                                            <p className="text-sm text-muted-foreground">
                                              {
                                                hospital.city
                                              }
                                            </p>
                                          )}
                                        </div>

                                        {hospital.rating !==
                                          null && (
                                            <span className="flex items-center gap-1 rounded-md bg-mint px-2 py-1 text-xs font-semibold">
                                              <Star className="size-3 fill-current" />

                                              {
                                                hospital.rating
                                              }
                                            </span>
                                          )}
                                      </div>

                                      {hospital.address && (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                          <MapPin className="mr-1 inline size-3.5" />

                                          {
                                            hospital.address
                                          }
                                        </p>
                                      )}

                                      {hospital.distance_km !==
                                        null &&
                                        hospital.distance_km !==
                                        undefined && (
                                          <p className="mt-2 text-xs font-semibold text-primary">
                                            📍{" "}
                                            {hospital.distance_km.toFixed(
                                              1,
                                            )}{" "}
                                            km away
                                          </p>
                                        )}

                                      {hospital.emergency && (
                                        <p className="mt-2 text-xs font-semibold text-destructive">
                                          🚑 Emergency
                                          services
                                          available
                                        </p>
                                      )}

                                      <div className="mt-4">
                                        {hospital.slug && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              window.location.assign(
                                                `/hospitals/${hospital.slug}`,
                                              );
                                            }}
                                          >
                                            View Hospital
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {sending && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                      <Bot className="size-4" />
                    </div>

                    <span className="animate-pulse">
                      cityhealth is thinking…
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}

          <div className="border-t bg-background p-4 sm:p-5">
            <form
              onSubmit={sendMessage}
              className="mx-auto flex max-w-3xl gap-2 rounded-xl border bg-card p-2 shadow-sm"
            >
              <Input
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                disabled={sending}
                placeholder="Describe your health concern…"
                className="h-11 border-0 shadow-none focus-visible:ring-0"
                maxLength={4000}
              />

              <Button
                type="submit"
                size="icon"
                disabled={
                  !input.trim() ||
                  sending
                }
                aria-label="Send message"
              >
                {sending ? (
                  <Spinner />
                ) : (
                  <Send />
                )}
              </Button>
            </form>

            <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
              For chest pain, severe breathlessness,
              stroke signs, heavy bleeding or other
              emergencies, seek urgent care and call
              112.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}