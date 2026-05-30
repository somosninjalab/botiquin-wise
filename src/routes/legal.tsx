import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Shield, FileText, AlertTriangle, Cookie } from "lucide-react";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Información Legal — ¡Alerta: Medicina!" },
      { name: "description", content: "Términos y Condiciones, Política de Privacidad, Aviso Legal y Política de Cookies de ¡Alerta: Medicina!, el comparador gratuito de precios de medicamentos en Venezuela." },
      { property: "og:title", content: "Información Legal — ¡Alerta: Medicina!" },
      { property: "og:description", content: "Términos, privacidad y cookies del comparador de precios de medicamentos." },
    ],
  }),
  component: LegalPage,
});

const sections = [
  { id: "privacidad", label: "Privacidad", icon: Shield },
  { id: "terminos", label: "Términos y Condiciones", icon: FileText },
  { id: "aviso-legal", label: "Aviso Legal", icon: AlertTriangle },
  { id: "cookies", label: "Cookies", icon: Cookie },
];

function LegalPage() {
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash) {
      const el = document.getElementById(hash.replace("#", ""));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  // Protección de contenido: deshabilitar copiar, cortar, menú contextual,
  // arrastrar, atajos de teclado (copiar/guardar/imprimir/devtools) y ocultar
  // el contenido al imprimir o al cambiar de pestaña (mitigación contra
  // capturas de pantalla; no es bloqueo absoluto, los SO no lo permiten).
  useEffect(() => {
    const block = (e: Event) => {
      e.preventDefault();
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (
        (mod && ["c", "x", "a", "s", "p", "u"].includes(k)) ||
        k === "printscreen" ||
        (e.shiftKey && mod && ["i", "j", "c"].includes(k)) ||
        k === "f12"
      ) {
        e.preventDefault();
      }
    };
    const onVis = () => {
      document.body.dataset.legalHidden = document.hidden ? "1" : "0";
    };
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    document.body.classList.add("legal-protected");
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      document.body.classList.remove("legal-protected");
      delete document.body.dataset.legalHidden;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground legal-no-copy">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <img src={logoUrl} alt="Alerta Medicina" className="w-6 h-6 rounded-md" />
            <span className="text-sm font-semibold">¡Alerta: Medicina!</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="relative py-16 bg-gradient-to-b from-primary/5 to-accent/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-black mb-4">
            Información{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Legal</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Conoce nuestras políticas, términos y avisos legales
          </p>
          <p className="text-sm text-muted-foreground mt-4">Última actualización: mayo de 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">
        <Privacidad />
        <Divider />
        <Terminos />
        <Divider />
        <AvisoLegal />
        <Divider />
        <Cookies />
      </div>

      <footer className="border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ¡Alerta: Medicina! · Todos los derechos reservados.
          </p>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Volver al inicio
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />;
}

function SectionHeader({ icon: Icon, title, gradient }: { icon: typeof Shield; title: string; gradient: string }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h2 className="text-3xl font-black">{title}</h2>
    </div>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-bold mb-2">{children}</h3>;
}

function Privacidad() {
  return (
    <section id="privacidad" className="scroll-mt-24">
      <SectionHeader icon={Shield} title="Política de Privacidad" gradient="bg-gradient-to-br from-primary to-primary-glow" />
      <p className="text-sm text-muted-foreground mb-6 italic">
        Usuarios de ¡Alerta: Medicina! (Venezuela) — Versión 1.0
      </p>
      <div className="space-y-8 text-foreground/80 leading-relaxed">
        <div>
          <H3>Introducción y objeto</H3>
          <div className="space-y-3">
            <p>La presente Política de Privacidad (la "Política") explica de manera clara y transparente cómo ¡Alerta: Medicina! ("Alerta Medicina", "nosotros") recoge, utiliza, almacena, comparte y protege los datos personales de las personas naturales que utilizan la plataforma alertamedicina.com y sus servicios asociados (los "Usuarios") desde la República Bolivariana de Venezuela.</p>
            <p>Esta Política complementa los Términos y Condiciones de Uso. En caso de contradicción entre ambos documentos en materia de protección de datos, prevalecerán las disposiciones de esta Política.</p>
            <p>Alerta Medicina es un comparador independiente y gratuito de precios de medicamentos. No vende medicamentos, no es una farmacia y no presta servicios sanitarios.</p>
          </div>
        </div>

        <div>
          <H3>Responsable del tratamiento y contacto</H3>
          <div className="space-y-3">
            <p>El responsable del tratamiento de los datos personales de los Usuarios es <strong>¡Alerta: Medicina!</strong>, plataforma operada en la República Bolivariana de Venezuela.</p>
            <p>Datos de contacto para consultas sobre privacidad o ejercicio de derechos:</p>
            <p>Correo electrónico: <a href="mailto:hola@alertamedicina.com" className="font-semibold text-primary hover:underline">hola@alertamedicina.com</a></p>
          </div>
        </div>

        <div>
          <H3>Ámbito de aplicación</H3>
          <div className="space-y-3">
            <p>Esta Política se aplica a los datos personales de los Usuarios que utilizan la Plataforma desde Venezuela.</p>
            <p>El tratamiento se sujeta, en lo que resulte pertinente, a la legislación venezolana aplicable en materia civil y mercantil, comercio electrónico, mensajes de datos y firmas electrónicas, protección al consumidor y al usuario, salud y protección de datos e información, incluyendo de forma enunciativa la Ley de Mensajes de Datos y Firmas Electrónicas, la Ley de Protección al Consumidor y al Usuario, la Ley Orgánica de Salud, la Ley Especial contra los Delitos Informáticos y las normas constitucionales sobre intimidad y habeas data (especialmente artículos 28 y 60 de la Constitución).</p>
          </div>
        </div>

        <div>
          <H3>Datos personales tratados</H3>
          <div className="space-y-3">
            <p>Alerta Medicina puede tratar las siguientes categorías de datos, en función de las funcionalidades utilizadas:</p>
            <p><strong>Datos identificativos y de contacto:</strong> nombre, apellidos, correo electrónico, teléfono (opcional), sexo, fecha de nacimiento, ciudad, región y país.</p>
            <p><strong>Datos de cuenta y uso de la Plataforma:</strong> nombre de usuario, registros de acceso (fecha, hora, IP aproximada), búsquedas realizadas, medicamentos consultados, alertas de precio activas, interacciones con el asistente de inteligencia artificial.</p>
            <p><strong>Datos de salud auto-declarados:</strong> únicamente la información que el propio Usuario decida compartir voluntariamente al buscar medicamentos, configurar alertas o conversar con el asistente (por ejemplo, una dolencia o el medicamento que necesita). Alerta Medicina no recibe historias clínicas, recetas médicas ni resultados de laboratorio.</p>
            <p><strong>Datos técnicos:</strong> identificadores de dispositivo, sistema operativo, navegador, dirección IP aproximada, cookies y tecnologías similares necesarias para el funcionamiento, analítica básica de uso y seguridad.</p>
            <p>Se aplica el principio de minimización: solo se tratan los datos adecuados, pertinentes y limitados a lo necesario para prestar el servicio.</p>
          </div>
        </div>

        <div>
          <H3>Finalidades del tratamiento</H3>
          <div className="space-y-3">
            <p>Alerta Medicina tratará los datos del Usuario para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Crear y gestionar su cuenta, permitir el inicio de sesión y la autenticación;</li>
              <li>Mostrar resultados de comparación de precios en las farmacias incluidas en la Plataforma (entre otras, Farmatodo, SAAS, Maraplus y Locatel);</li>
              <li>Enviar alertas y notificaciones cuando el precio de un medicamento siga el patrón configurado por el Usuario;</li>
              <li>Responder consultas mediante el asistente de IA y mejorar sus recomendaciones;</li>
              <li>Enviar recordatorios y comunicaciones operativas relacionadas con el servicio;</li>
              <li>Mantener la seguridad, prevenir fraude y abuso, y cumplir obligaciones legales;</li>
              <li>Generar estadísticas agregadas y anónimas sobre uso de la Plataforma, búsquedas más frecuentes y disponibilidad de medicamentos, sin identificar a los Usuarios;</li>
              <li>Enviar comunicaciones comerciales sobre nuevas funcionalidades o promociones, únicamente cuando el Usuario lo haya autorizado (opt-in) y con posibilidad de darse de baja en cualquier momento.</li>
            </ul>
          </div>
        </div>

        <div>
          <H3>Base jurídica del tratamiento</H3>
          <div className="space-y-3">
            <p>El tratamiento se basa en:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>La ejecución del servicio que el Usuario solicita al registrarse y al utilizar la Plataforma;</li>
              <li>El consentimiento previo, expreso, libre, informado y revocable otorgado por el Usuario, en particular al aceptar estos términos y al activar alertas, comunicaciones comerciales o el uso del asistente de IA;</li>
              <li>El cumplimiento de obligaciones legales aplicables;</li>
              <li>El interés legítimo de Alerta Medicina en garantizar la seguridad, prevenir fraude y mejorar el servicio, ponderado siempre con los derechos del Usuario.</li>
            </ul>
          </div>
        </div>

        <div>
          <H3>Plazos de conservación</H3>
          <div className="space-y-3">
            <p>Los datos se conservarán mientras la cuenta del Usuario permanezca activa y durante los plazos legales aplicables. Cuando los plazos venzan, los datos serán suprimidos de forma segura o anonimizados de manera irreversible para fines estadísticos.</p>
          </div>
        </div>

        <div>
          <H3>Cesiones y encargados del tratamiento</H3>
          <div className="space-y-3">
            <p>Los datos personales podrán ser comunicados a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proveedores de servicios tecnológicos (alojamiento en la nube, base de datos, envío de correos y notificaciones, analítica), que actúan como encargados del tratamiento bajo instrucciones de Alerta Medicina y con obligaciones contractuales de confidencialidad y seguridad;</li>
              <li>Proveedores de modelos de inteligencia artificial, únicamente para procesar las consultas del asistente, sin uso posterior para entrenamiento sin consentimiento;</li>
              <li>Autoridades administrativas, regulatorias o judiciales, cuando la comunicación sea exigida por ley.</li>
            </ul>
            <p>Alerta Medicina <strong>no vende ni cede datos personales a las farmacias</strong> comparadas ni a terceros con fines comerciales sin consentimiento expreso.</p>
          </div>
        </div>

        <div>
          <H3>Transferencias internacionales de datos</H3>
          <div className="space-y-3">
            <p>La infraestructura tecnológica puede implicar el alojamiento o el acceso a datos desde servidores ubicados fuera de Venezuela. En tales casos, Alerta Medicina adopta medidas contractuales, técnicas y organizativas razonables para garantizar un nivel de protección equiparable al exigido por la normativa venezolana.</p>
          </div>
        </div>

        <div>
          <H3>Derechos de los Usuarios</H3>
          <div className="space-y-3">
            <p>Conforme a la Constitución venezolana y la jurisprudencia sobre habeas data, el Usuario puede:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Acceder</strong> a los datos personales que Alerta Medicina trata sobre él;</li>
              <li><strong>Rectificar</strong> datos inexactos o desactualizados;</li>
              <li><strong>Suprimir</strong> sus datos cuando ya no sean necesarios o retire su consentimiento, salvo obligaciones legales de conservación;</li>
              <li><strong>Limitar u oponerse</strong> a ciertos tratamientos cuando existan motivos legítimos;</li>
              <li><strong>Revocar el consentimiento</strong> para comunicaciones comerciales o para tratamientos basados en consentimiento, sin efecto retroactivo;</li>
              <li><strong>Portabilidad</strong> de los datos en la medida en que sea técnicamente posible.</li>
            </ul>
            <p>Para ejercer estos derechos puede escribir a <a href="mailto:hola@alertamedicina.com" className="font-semibold text-primary hover:underline">hola@alertamedicina.com</a>. También puede acudir a los tribunales venezolanos mediante acciones de amparo o habeas data.</p>
          </div>
        </div>

        <div>
          <H3>Seguridad de la información</H3>
          <div className="space-y-3">
            <p>Alerta Medicina implementa medidas técnicas y organizativas razonables para proteger los datos, incluyendo cifrado en tránsito, autenticación, control de accesos, registros de actividad y copias de seguridad. Ningún sistema es completamente invulnerable; en caso de incidente relevante, se activarán los protocolos internos de respuesta y se notificará a Usuarios y autoridades cuando proceda.</p>
          </div>
        </div>

        <div>
          <H3>Menores de edad</H3>
          <div className="space-y-3">
            <p>La Plataforma está dirigida a personas mayores de edad. Las cuentas de menores deben ser creadas y administradas por sus padres o representantes legales, quienes declaran tener la autoridad para suministrar y autorizar el tratamiento de sus datos.</p>
          </div>
        </div>

        <div>
          <H3>Cambios en la Política de Privacidad</H3>
          <div className="space-y-3">
            <p>Alerta Medicina podrá actualizar esta Política por motivos normativos, técnicos u operativos. La versión vigente estará siempre disponible en la Plataforma, indicando la fecha de última actualización. Cuando los cambios sean relevantes, se informará al Usuario por medios razonables.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Terminos() {
  return (
    <section id="terminos" className="scroll-mt-24">
      <SectionHeader icon={FileText} title="Términos y Condiciones" gradient="bg-gradient-to-br from-accent to-accent-glow" />
      <p className="text-sm text-muted-foreground mb-6 italic">
        Términos y Condiciones de Uso de ¡Alerta: Medicina! — Versión 1.0
      </p>
      <div className="space-y-8 text-foreground/80 leading-relaxed">
        <div>
          <H3>1. Objeto y aceptación</H3>
          <div className="space-y-3">
            <p>1.1. El presente documento (los "Términos") regula el acceso y uso por parte de personas naturales (el "Usuario" o "usted") de la plataforma ¡Alerta: Medicina! disponible en alertamedicina.com, sus módulos, funcionalidades asociadas, sitios web y servicios complementarios (conjuntamente, la "Plataforma").</p>
            <p>1.2. Al registrarse, acceder o utilizar la Plataforma, el Usuario declara que ha leído, comprendido y acepta íntegramente estos Términos, obligándose a cumplirlos.</p>
            <p>1.3. Si el Usuario no está de acuerdo con estos Términos, deberá abstenerse de utilizar la Plataforma.</p>
          </div>
        </div>

        <div>
          <H3>2. Identidad del proveedor y marco normativo</H3>
          <div className="space-y-3">
            <p>2.1. La Plataforma es operada por <strong>¡Alerta: Medicina!</strong>, prestador de servicios tecnológicos en la República Bolivariana de Venezuela.</p>
            <p>2.2. La prestación del servicio se sujeta, en lo pertinente, a la legislación venezolana aplicable en materia civil y mercantil, comercio electrónico, mensajes de datos y firmas electrónicas, protección al consumidor y al usuario, salud y protección de datos e información, incluyendo de forma enunciativa el Código Civil, el Código de Comercio, la Ley de Mensajes de Datos y Firmas Electrónicas, la Ley Orgánica de Salud, la Ley Especial contra los Delitos Informáticos y las normas constitucionales sobre intimidad y habeas data.</p>
          </div>
        </div>

        <div>
          <H3>3. Descripción del servicio y exclusiones</H3>
          <div className="space-y-3">
            <p>3.1. Alerta Medicina es un comparador independiente y gratuito de precios de medicamentos en Venezuela, que ofrece de forma enunciativa y no limitativa:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Búsqueda y comparación de precios:</strong> consulta de precios publicados por farmacias como Farmatodo, SAAS, Maraplus y Locatel, entre otras, en tiempo cuasi-real.</li>
              <li><strong>Alertas de precio:</strong> notificaciones cuando el precio de un medicamento configurado por el Usuario baje o cumpla las condiciones definidas.</li>
              <li><strong>Asistente de IA:</strong> herramienta conversacional para ayudar al Usuario a identificar medicamentos por nombre, principio activo o síntoma, y a comparar opciones.</li>
              <li><strong>Listado de farmacias y disponibilidad:</strong> información referencial sobre la oferta de las farmacias incluidas.</li>
            </ul>
            <p>3.2. <strong>Alerta Medicina no es una farmacia, no vende medicamentos y no presta servicios sanitarios.</strong> En particular, el Usuario reconoce y acepta que la Plataforma:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>no presta servicios médicos, de diagnóstico, telemedicina, prescripción ni seguimiento clínico;</li>
              <li>no dispensa, comercializa ni distribuye medicamentos;</li>
              <li>no garantiza la disponibilidad efectiva, el stock real, la calidad ni el precio final aplicado por las farmacias en el punto de venta;</li>
              <li>no sustituye el consejo profesional de un médico o farmacéutico;</li>
              <li>no debe utilizarse en situaciones de emergencia médica.</li>
            </ul>
            <p>3.3. Ante cualquier síntoma o cuadro que pueda revestir gravedad o urgencia, el Usuario deberá acudir de forma inmediata a los servicios de emergencia o consultar con un profesional de la salud, sin utilizar la Plataforma como vía de consulta o alerta.</p>
            <p>3.4. Los precios mostrados son referenciales y se obtienen de fuentes públicas de cada farmacia. Pueden no reflejar el precio final, promociones, descuentos o impuestos aplicables en el momento de la compra. La verificación del precio definitivo debe realizarse directamente con la farmacia.</p>
          </div>
        </div>

        <div>
          <H3>4. Funcionamiento de las alertas de precio</H3>
          <ul className="list-disc pl-6 space-y-2">
            <li>El Usuario puede activar y desactivar alertas para cada medicamento que le interese.</li>
            <li>Las alertas tienen carácter meramente informativo y dependen de la disponibilidad de datos de las farmacias, de la configuración del dispositivo y de terceros (proveedores de correo, notificaciones PUSH), por lo que Alerta Medicina no garantiza su recepción efectiva ni en tiempo real.</li>
            <li>Una alerta no constituye una oferta vinculante por parte de la farmacia. El precio efectivo de venta puede variar entre la emisión de la alerta y el momento de la compra.</li>
            <li>Alerta Medicina no es responsable de retrasos, omisiones o errores en la entrega de alertas.</li>
          </ul>
        </div>

        <div>
          <H3>5. Uso de herramientas de inteligencia artificial (IA)</H3>
          <div className="space-y-3">
            <p>5.1. La Plataforma incorpora un asistente de IA para ayudar al Usuario a buscar medicamentos. Cuando una funcionalidad utiliza IA, la Plataforma lo indica de forma visible.</p>
            <p>5.2. Las funcionalidades de IA tienen carácter exclusivamente informativo y de orientación de búsqueda. <strong>No generan diagnósticos médicos, prescripciones ni recomendaciones sanitarias individualizadas.</strong> El Usuario no debe interpretar los resultados como consejo médico ni tomar decisiones sobre su salud basándose únicamente en ellos.</p>
            <p>5.3. Los contenidos producidos por IA pueden contener errores, omisiones o estar desactualizados. Alerta Medicina no garantiza su exactitud y recomienda confirmar siempre la información con un profesional de la salud y con la propia farmacia.</p>
          </div>
        </div>

        <div>
          <H3>6. Elegibilidad y registro</H3>
          <div className="space-y-3">
            <p>6.1. Podrán utilizar la Plataforma las personas naturales mayores de edad con capacidad legal para contratar conforme a la ley de su país de residencia.</p>
            <p>6.2. El Usuario se obliga a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar información veraz, exacta y actualizada al registrarse;</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso;</li>
              <li>Notificar sin demora a Alerta Medicina cualquier uso no autorizado de su cuenta o incidente de seguridad detectado.</li>
            </ul>
            <p>6.3. Toda acción realizada mediante las credenciales del Usuario se presumirá realizada por éste, salvo prueba en contrario.</p>
            <p>6.4. Al completar el registro, el Usuario acepta expresamente estos Términos y Condiciones y la Política de Privacidad de la Plataforma.</p>
          </div>
        </div>

        <div>
          <H3>7. Licencia de uso</H3>
          <div className="space-y-3">
            <p>Alerta Medicina concede al Usuario una licencia personal, limitada, revocable, no exclusiva, no sublicenciable y no transferible para utilizar la Plataforma con fines privados y conforme a estos Términos. Esta licencia no implica cesión de derechos de propiedad intelectual ni autoriza la explotación comercial, ingeniería inversa, scraping o extracción masiva de datos.</p>
          </div>
        </div>

        <div>
          <H3>8. Propiedad intelectual</H3>
          <div className="space-y-3">
            <p>La Plataforma, su software, código, diseño, interfaces, nombre comercial, logotipos, bases de datos y demás activos son titularidad de Alerta Medicina o se explotan bajo licencia legítima. El Usuario se abstendrá de copiar, reproducir, distribuir o transformar la Plataforma fuera de los límites de uso legítimo, así como de utilizar marcas o signos distintivos sin autorización previa y escrita.</p>
            <p>Las marcas y logotipos de las farmacias incluidas (Farmatodo, SAAS, Maraplus, Locatel y otras) son propiedad de sus respectivos titulares y se utilizan exclusivamente con fines descriptivos e informativos, sin que ello implique afiliación, patrocinio o respaldo.</p>
          </div>
        </div>

        <div>
          <H3>9. Uso permitido y prohibido</H3>
          <div className="space-y-3">
            <p>9.1. <strong>Uso permitido.</strong> El Usuario podrá utilizar la Plataforma para la consulta personal de precios, la activación de alertas y la interacción con el asistente.</p>
            <p>9.2. <strong>Uso prohibido.</strong> El Usuario no podrá:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>utilizar la Plataforma con fines ilícitos o contrarios a estos Términos;</li>
              <li>automatizar accesos o extraer datos mediante scraping, crawling, minería de datos u otras formas de acceso masivo no autorizadas;</li>
              <li>desarrollar productos o servicios competidores utilizando información extraída de la Plataforma;</li>
              <li>introducir malware, código malicioso o realizar acciones que puedan dañar, deshabilitar o sobrecargar la Plataforma o su infraestructura;</li>
              <li>intentar acceder sin autorización a cuentas, sistemas, redes o datos de otros Usuarios o de Alerta Medicina;</li>
              <li>cargar contenido ilegal, difamatorio, engañoso, ofensivo o que vulnere derechos de terceros.</li>
            </ul>
            <p>9.3. El Usuario reconoce que cualquier acceso no autorizado puede constituir delito conforme a la Ley Especial contra los Delitos Informáticos y demás normas penales aplicables.</p>
          </div>
        </div>

        <div>
          <H3>10. Servicio gratuito y eventuales planes de pago</H3>
          <div className="space-y-3">
            <p>Actualmente la Plataforma se ofrece de forma gratuita. Alerta Medicina podrá, en el futuro, introducir planes premium o funcionalidades de pago, comunicándolo de forma clara y previa al Usuario, sin afectar las funcionalidades gratuitas ya disponibles para cuentas existentes salvo notificación expresa.</p>
          </div>
        </div>

        <div>
          <H3>11. Disponibilidad del servicio</H3>
          <div className="space-y-3">
            <p>Alerta Medicina realizará esfuerzos razonables para mantener la Plataforma operativa 24/7, pero no garantiza disponibilidad ininterrumpida ni ausencia de errores. Podrán existir interrupciones por mantenimiento, actualizaciones, fallas técnicas, ataques informáticos o causas de fuerza mayor.</p>
          </div>
        </div>

        <div>
          <H3>12. Limitación de responsabilidad</H3>
          <div className="space-y-3">
            <p>12.1. La Plataforma se ofrece "tal cual" y "según disponibilidad". En la máxima medida permitida por la ley, Alerta Medicina no será responsable de:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>diferencias entre el precio mostrado y el precio cobrado finalmente por la farmacia;</li>
              <li>falta de stock, errores de catálogo o cambios de presentación de los medicamentos;</li>
              <li>decisiones de salud tomadas por el Usuario sobre la base de la información mostrada;</li>
              <li>retrasos, omisiones o fallos en la entrega de alertas o notificaciones;</li>
              <li>el contenido, las prácticas comerciales o las políticas de las farmacias o de cualquier tercero enlazado desde la Plataforma;</li>
              <li>daños indirectos, lucro cesante, pérdida de oportunidad o pérdida de datos.</li>
            </ul>
            <p>12.2. Nada en estos Términos limita la responsabilidad que no pueda ser excluida conforme a la legislación aplicable.</p>
          </div>
        </div>

        <div>
          <H3>13. Protección de datos personales</H3>
          <div className="space-y-3">
            <p>El tratamiento de los datos personales del Usuario se rige por la Política de Privacidad de Alerta Medicina, que forma parte integrante de estos Términos. Al registrarse, el Usuario otorga su consentimiento expreso, informado e inequívoco para el tratamiento de sus datos en los términos allí descritos.</p>
          </div>
        </div>

        <div>
          <H3>14. Modificación de los Términos</H3>
          <div className="space-y-3">
            <p>Alerta Medicina podrá modificar estos Términos para adaptarlos a cambios normativos, técnicos u operativos. La versión vigente estará siempre accesible en la Plataforma. Cuando los cambios sean sustanciales, se notificará al Usuario por medios razonables (notificación en la app, correo electrónico u otros) y, cuando proceda, se solicitará su nueva aceptación.</p>
          </div>
        </div>

        <div>
          <H3>15. Terminación</H3>
          <div className="space-y-3">
            <p>El Usuario puede cerrar su cuenta en cualquier momento. Alerta Medicina podrá suspender o cancelar el acceso del Usuario en caso de incumplimiento grave de estos Términos, uso fraudulento o por requerimiento legal.</p>
          </div>
        </div>

        <div>
          <H3>16. Ley aplicable y jurisdicción</H3>
          <div className="space-y-3">
            <p>Estos Términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier controversia derivada de los mismos será sometida a los tribunales competentes de la ciudad de Caracas, sin perjuicio de los derechos irrenunciables que la ley reconozca al Usuario consumidor.</p>
          </div>
        </div>

        <div>
          <H3>17. Contacto</H3>
          <div className="space-y-3">
            <p>Para cualquier consulta relacionada con estos Términos, el Usuario puede escribir a <a href="mailto:hola@alertamedicina.com" className="font-semibold text-primary hover:underline">hola@alertamedicina.com</a>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AvisoLegal() {
  return (
    <section id="aviso-legal" className="scroll-mt-24">
      <SectionHeader icon={AlertTriangle} title="Aviso Legal" gradient="bg-gradient-to-br from-primary to-accent" />
      <p className="text-sm text-muted-foreground mb-6 italic">¡Alerta: Medicina! (Venezuela)</p>
      <div className="space-y-8 text-foreground/80 leading-relaxed">
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <p className="text-sm">Este es un resumen informativo. No sustituye a los Términos y Condiciones, a la Política de Privacidad ni a la Política de Cookies, que debes leer y aceptar antes de usar Alerta Medicina.</p>
        </div>

        <div>
          <H3>Qué es Alerta Medicina</H3>
          <div className="space-y-3">
            <p>¡Alerta: Medicina! es un comparador independiente y gratuito de precios de medicamentos en Venezuela. Te ayuda a (i) buscar el medicamento que necesitas, (ii) comparar precios entre farmacias como Farmatodo, SAAS, Maraplus y Locatel, (iii) configurar alertas para que te avisemos cuando un medicamento baje de precio, y (iv) conversar con un asistente de IA que orienta tu búsqueda.</p>
            <p>No somos una farmacia ni un centro médico. No vendemos medicamentos, no prestamos atención sanitaria y no sustituimos la consulta con un profesional. Ante una emergencia, acude siempre a los servicios sanitarios de tu país.</p>
          </div>
        </div>

        <div>
          <H3>Qué datos tratamos</H3>
          <div className="space-y-3">
            <p>Tratamos:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tus datos identificativos y de contacto (nombre, correo, teléfono opcional, sexo, fecha de nacimiento, ciudad);</li>
              <li>Datos de uso de la plataforma (búsquedas, alertas activas, interacciones con el asistente);</li>
              <li>La información que tú decidas compartir voluntariamente al buscar medicamentos o al usar el asistente.</li>
            </ul>
            <p>No recibimos historias clínicas, recetas ni resultados de laboratorio.</p>
          </div>
        </div>

        <div>
          <H3>Para qué usamos tu información</H3>
          <div className="space-y-3">
            <ul className="list-disc pl-6 space-y-2">
              <li>Crear y gestionar tu cuenta;</li>
              <li>Mostrarte comparaciones de precios y enviarte alertas configuradas por ti;</li>
              <li>Mejorar el servicio y obtener estadísticas agregadas y anónimas;</li>
              <li>Mantener la seguridad y cumplir obligaciones legales.</li>
            </ul>
            <p>La base es la ejecución del servicio que nos solicitas y tu consentimiento expreso al registrarte.</p>
          </div>
        </div>

        <div>
          <H3>Con quién compartimos los datos</H3>
          <div className="space-y-3">
            <p>Solo con proveedores tecnológicos que nos ayudan a operar (alojamiento, correo, notificaciones, asistente de IA), bajo contratos de confidencialidad. <strong>No vendemos ni cedemos tus datos a las farmacias</strong> ni a terceros con fines comerciales.</p>
          </div>
        </div>

        <div>
          <H3>Tus derechos</H3>
          <div className="space-y-3">
            <p>Puedes acceder, rectificar, suprimir, limitar u oponerte al tratamiento, revocar tu consentimiento y solicitar la portabilidad de tus datos. Para ejercer tus derechos escribe a <a href="mailto:hola@alertamedicina.com" className="font-semibold text-primary hover:underline">hola@alertamedicina.com</a>.</p>
          </div>
        </div>

        <div>
          <H3>Información completa</H3>
          <div className="space-y-3">
            <p>Antes de utilizar Alerta Medicina, te recomendamos leer los Términos y Condiciones, la Política de Privacidad y la Política de Cookies.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cookies() {
  return (
    <section id="cookies" className="scroll-mt-24">
      <SectionHeader icon={Cookie} title="Política de Cookies" gradient="bg-gradient-to-br from-accent-glow to-primary" />
      <p className="text-sm text-muted-foreground mb-6 italic">Usuarios de ¡Alerta: Medicina! (Venezuela) — Versión 1.0</p>
      <div className="space-y-8 text-foreground/80 leading-relaxed">
        <div>
          <H3>¿Qué son las cookies?</H3>
          <div className="space-y-3">
            <p>Las cookies son pequeños archivos de texto que se descargan en tu dispositivo cuando accedes a determinados sitios web o aplicaciones y permiten almacenar y recuperar información sobre la navegación realizada. Bajo el término "cookies" incluimos también tecnologías equivalentes como SDK, píxeles o etiquetas.</p>
          </div>
        </div>

        <div>
          <H3>¿Para qué utiliza cookies Alerta Medicina?</H3>
          <div className="space-y-3">
            <ul className="list-disc pl-6 space-y-2">
              <li>Permitir el funcionamiento básico y la seguridad de la Plataforma (sesión, autenticación);</li>
              <li>Recordar tus preferencias (idioma, configuración);</li>
              <li>Obtener estadísticas agregadas sobre el uso de la Plataforma para mejorar el servicio;</li>
              <li>En su caso, mostrar contenidos o comunicaciones más relevantes, dentro del marco del consentimiento otorgado.</li>
            </ul>
            <p>Alerta Medicina no utiliza cookies para perfilado con fines discriminatorios ni para decisiones automatizadas con efectos jurídicos sobre el Usuario.</p>
          </div>
        </div>

        <div>
          <H3>Tipos de cookies que podemos utilizar</H3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Según su finalidad</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Técnicas o necesarias:</strong> imprescindibles para el funcionamiento del servicio (sesión, seguridad). No requieren consentimiento.</li>
                <li><strong>De preferencias:</strong> recuerdan configuración del Usuario.</li>
                <li><strong>De análisis:</strong> permiten medir el uso de la Plataforma de forma agregada.</li>
                <li><strong>De marketing:</strong> solo si las activas, miden la eficacia de comunicaciones o promociones.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Según su duración</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>De sesión:</strong> se eliminan al cerrar el navegador.</li>
                <li><strong>Persistentes:</strong> permanecen durante un periodo definido.</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <H3>Base jurídica y consentimiento</H3>
          <div className="space-y-3">
            <p>Las cookies técnicas se instalan sin necesidad de consentimiento, pues son necesarias para prestar el servicio. Las demás solo se instalan cuando el Usuario otorga su consentimiento expreso a través del banner o panel de configuración, consentimiento que puede retirar en cualquier momento.</p>
          </div>
        </div>

        <div>
          <H3>Configuración del navegador</H3>
          <div className="space-y-3">
            <p>Además de los mecanismos disponibles en la Plataforma, puedes configurar tu navegador para aceptar, rechazar o eliminar cookies. El bloqueo o eliminación de cookies puede afectar al funcionamiento de determinadas funcionalidades.</p>
          </div>
        </div>

        <div>
          <H3>Contacto</H3>
          <p>Para cualquier consulta sobre cookies, escribe a <a href="mailto:hola@alertamedicina.com" className="font-semibold text-primary hover:underline">hola@alertamedicina.com</a>.</p>
        </div>
      </div>
    </section>
  );
}