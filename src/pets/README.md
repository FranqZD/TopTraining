# Mascotas

SVG animado. Cinco especies, cinco niveles.

- `ok`: ya marcaste hoy.
- `day1`: todavía no marcas, misma silueta del nivel, color caído.
- `dormant`: no llegaste a la meta. El nivel vuelve a 1.

```tsx
<Pet species="bonsai" level={4} health="ok" size={120} />
```

Los colores salen de `pets.css`, mapeados al tema de la app.
