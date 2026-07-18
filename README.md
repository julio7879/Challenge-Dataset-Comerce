# 📊 Análisis de Inventario y Ventas

## Descripción del proyecto

Este proyecto presenta un análisis de datos aplicado a la gestión de inventario y ventas de una empresa dedicada a la comercialización de plantas ornamentales.

El objetivo del análisis es transformar los datos operativos en información útil para apoyar la toma de decisiones mediante técnicas de análisis exploratorio, estadística descriptiva, análisis cuantitativo, tendencias, correlación y proyección de demanda.

---

# Objetivos

- Analizar el comportamiento de las ventas.
- Evaluar el estado del inventario.
- Identificar los productos con mayor desempeño.
- Detectar riesgos de desabastecimiento.
- Estimar la demanda del siguiente período.
- Generar recomendaciones orientadas al negocio.

---

# Datos utilizados

Se trabajó con dos conjuntos de datos:

## Inventario

Información de los productos disponibles.

Variables:

- id_producto
- producto
- cantidad_existente
- proveedor
- valor_compra
- valor_venta

## Ventas

Registros diarios de ventas correspondientes al mes de mayo de 2026.

Variables:

- fecha
- id_producto
- producto
- cantidad
- valor_unitario
- total

---

# Proceso de análisis

El análisis se desarrolló siguiendo las siguientes etapas:

1. Definición del problema.
2. Descripción de los datos.
3. Revisión de la calidad de los datos.
4. Preparación y enriquecimiento de la información.
5. Análisis exploratorio.
6. Estadística descriptiva.
7. Análisis cuantitativo.
8. Análisis de tendencias.
9. Análisis de correlación.
10. Proyección de demanda.
11. Interpretación de resultados.
12. Recomendaciones para la toma de decisiones.

---

# Indicadores obtenidos

| Indicador | Resultado |
|-----------|----------:|
| Ventas Totales | $8.985.000 COP |
| Total Unidades Vendidas | 198 |
| Total Productos | 12 |
| Inventario Total | 516 unidades |
| Valor Total del Inventario | $20.547.000 COP |
| Producto Más Vendido | Pothos |
| Producto Más Rentable | Pothos |
| Demanda Proyectada | 192 unidades |

---

# Top 5 Productos Más Vendidos

| Posición | Producto | Unidades |
|----------|-----------------------|---------:|
| 1 | Pothos | 55 |
| 2 | Cactus Mini | 41 |
| 3 | Suculenta Echeveria | 35 |
| 4 | Lavanda | 20 |
| 5 | Monstera Deliciosa | 17 |

---

# Productos con Inventario Bajo

- Bonsái
- Ficus Lyrata
- Palma Areca
- Orquídea Phalaenopsis

Estos productos presentan menos de 25 unidades disponibles y requieren reabastecimiento.

---

# Principales Insights

## Insight 1

Pothos fue el producto con mejor desempeño, liderando tanto las ventas como la rentabilidad.

---

## Insight 2

Los productos de menor precio presentan la mayor rotación de inventario, especialmente Pothos, Cactus Mini y Suculenta Echeveria.

---

## Insight 3

Se identificó riesgo de desabastecimiento en cuatro productos debido a sus bajos niveles de inventario.

---

## Insight 4

Las ventas muestran un incremento durante los últimos días del mes, lo que indica una posible estacionalidad mensual.

---

## Insight 5

La empresa mantiene un portafolio equilibrado entre productos de alta rotación y productos premium, diversificando sus fuentes de ingresos.

---

# Recomendaciones

- Incrementar el inventario de los productos con mayor demanda.
- Reabastecer prioritariamente los productos con inventario bajo.
- Aprovechar el incremento de ventas al final de cada mes mediante campañas comerciales y una adecuada planificación del inventario.

---

# Datasets generados

Como resultado del análisis se construyeron los siguientes datasets:

- dataset1_indicadores.csv
- dataset2_top5.csv
- dataset3_inventario_bajo.csv
- dataset4_proyeccion.csv
- dataset5_insights.csv
- dataset6_recomendaciones.csv

Estos archivos pueden utilizarse directamente en:

- Microsoft Excel
- Power BI
- Tableau
- Python (Pandas)
- SQL
- R

---

# Tecnologías sugeridas

- Excel
- Power BI
- Tableau
- Python
- Pandas
- SQL
- Jupyter Notebook

---

# Conclusión

El análisis permitió identificar los productos con mayor desempeño comercial, evaluar el estado del inventario y proyectar la demanda para el siguiente período. Los resultados evidencian que Pothos representa el producto estratégico del negocio, mientras que algunos productos premium requieren una gestión más cuidadosa del inventario para evitar pérdidas por desabastecimiento. Asimismo, la tendencia de crecimiento en las ventas hacia el cierre del mes constituye una oportunidad para planificar campañas comerciales y optimizar la reposición de existencias.