---
title: "Mi Primer Buffer Overflow: Introducción al Hacking de Memoria 1"
date: 2025-08-15T21:13:00.000-06:00
excerpt: El Buffer Overflow es una de las vulnerabilidades más clásicas y
  fascinantes en ciberseguridad. En este artículo exploramos desde cero qué es,
  cómo ocurre y por qué sigue siendo relevante en el mundo moderno. Ideal para
  quienes quieren dar sus primeros pasos en la explotación de vulnerabilidades
  de memoria, con ejemplos prácticos y explicaciones sencillas.
category: Threat Hunting
difficulty: Intermedio
reading_time: 7
cover: /static/img/chatgpt-image-aug-15-2025-09_15_37-pm.png
---
# Introducción

El *Buffer Overflow* es uno de los primeros conceptos que muchos hackers éticos y especialistas en seguridad informática estudian. Se trata de un error de programación que ocurre cuando un programa escribe más datos de los que un buffer (memoria reservada) puede almacenar.

# ¿Qué es un Buffer?

Un *buffer* es un espacio en memoria destinado a almacenar datos temporales. Por ejemplo, cuando un programa pide al usuario que ingrese su nombre, este se guarda en un buffer.

El problema surge cuando el programador no válida la longitud de lo que se ingresa, permitiendo que datos extra sobrescriban otras partes de la memoria.

## Ejemplo sencillo

Imagina que un programa reserva 10 espacios de memoria para un nombre:

`Nombre[10]`

Si el usuario escribe *"Solo"* (4 letras), todo bien.

Pero si escribe *"AAAAAAAAAAAAAAAAAAAAAAAA"* (30 caracteres), el programa no sabrá detenerse y sobrescribirá memoria adyacente.

# Impacto en la seguridad

Un atacante puede aprovechar un *Buffer Overflow* para:

* Sobrescribir instrucciones del programa.
  Redirigir el flujo de ejecución.
* Ejecutar código malicioso.

Este tipo de ataque ha sido usado en numerosos exploits históricos y es base para aprender sobre **explotación avanzada**.

 Ejemplo real en C

`#include <stdio.h>`

`#include <string.h>`

``

`int main() {`

`char buffer[10];`

`printf("Escribe tu nombre: ");`

`gets(buffer); // ⚠️ vulnerable`

`printf("Hola, %s\n", buffer);`

`return 0;`

`}`

El uso de `gets()` sin validación es un ejemplo clásico de función vulnerable.

# Mitigaciones modernas

Hoy en día existen varias defensas:

* **Stack Canaries** 🛡️: detectan sobrescritura de memoria.

  **DEP (Data Execution Prevention)**: evita ejecutar código en memoria de datos.

  **ASLR (Address Space Layout Randomization)**: aleatoriza direcciones en memoria.

# Conclusión

Aprender *Buffer Overflow* es abrir la puerta al mundo del hacking y entender cómo pequeños errores de programación pueden convertirse en grandes vulnerabilidades. Es un conocimiento esencial para todo profesional de la ciberseguridad.
