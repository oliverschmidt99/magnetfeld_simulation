# Berechnung der Sekundärströme in einem Dreileiter-System

## Aufgabenstellung für die FEM-Simulation (FEMM)

Das System besteht aus drei Leitern (L1, L2, L3), die jeweils von einem eigenen Stromwandler erfasst werden. Zur Analyse des B-Feldes soll in jedem der drei Wandlermodelle eine Integral-Linie entlang des mittleren Pfades des jeweiligen Kerns definiert werden.

**Ziele:**

- Berechnung des B-Feldes entlang der Linie für jeden Leiter.
- Ermittlung der exakten Länge der Integral-Linie ($l_m$) für jeden Kern.

## Theoretische Berechnung

Die folgenden Schritte beschreiben die Berechnung des Sekundärstroms ($I_{sek}$) für **einen einzelnen Leiter**. Diese Berechnung muss für jeden der drei Leiter (L1, L2, L3) separat durchgeführt werden, um die jeweiligen Sekundärströme $I_{sek, L1}$, $I_{sek, L2}$ und $I_{sek, L3}$ zu erhalten.

### 1. Magnetischer Widerstand ($R_m$)

Der magnetische Widerstand des Kerns wird wie folgt berechnet:

$$
R_m = \frac{l_m}{\mu_0 \mu_r A}
$$

Dabei ist:

- $l_m$: Die mittlere Länge des magnetischen Pfades des jeweiligen Kerns.
- $\mu_0$: Die magnetische Feldkonstante ($4\pi \cdot 10^{-7} \, \frac{H}{m}$).
- $\mu_r$: Die relative Permeabilität des Kernmaterials.
- $A$: Die Querschnittsfläche des Kerns.

### 2. Magnetischer Fluss ($\Phi$)

Der magnetische Fluss wird aus der mittleren magnetischen Flussdichte und der Querschnittsfläche des Kerns bestimmt:

$$
\Phi = B_{messung} \cdot A
$$

- $B_{messung}$: Die im jeweiligen Kern gemessene mittlere magnetische Flussdichte.

### 3. Magnetische Durchflutung ($\Theta$)

Die Durchflutung (auch magnetische Spannung) ist das Produkt aus dem magnetischen Fluss und dem magnetischen Widerstand:

$$
\Theta = \Phi \cdot R_m
$$

### 4. Sekundärstrom ($I_{sek}$)

Der Sekundärstrom für den betrachteten Leiter ergibt sich aus der Durchflutung und der Anzahl der Sekundärwicklungen ($w_2$):

$$
I_{sek} = \frac{\Theta}{w_2}
$$

### Bestimmung der Sekundärwicklungszahl ($w_2$)

Die Anzahl der Sekundärwicklungen ($w_2$) ist für alle drei Wandler im System identisch und kann aus dem Übersetzungsverhältnis abgeleitet werden. Für die meisten Stromwandler wird die Primärwicklung ($w_1$) als eine einzelne Windung angenommen ($w_1 = 1$).

Für einen Wandler mit der Angabe **4000/5 A** oder **3000/5 A** berechnet sich $w_2$ wie folgt:

$$
w_2 = \frac{I_{prim, Nenn}}{I_{sek, Nenn}} \cdot w_1 = \frac{4000 \, A}{5 \, A} \cdot 1 = 800
$$
