# Mascotas

SVG animado. Cinco especies, cinco niveles. Al tocarla reacciona una vez.

- `ok`: ya marcaste hoy.
- `day1`: todavía no marcas, o no llegaste a la meta: misma silueta del nivel, color caído.
- `dormant`: hibernando. En producto, fallar la semana baja un nivel; no vuelve a 1.

```tsx
<Pet species="bonsai" level={4} health="ok" size={120} />
<Pet species="bird" level={3} interactive={false} />
```

Los colores salen de `pets.css`, mapeados al tema de la app. `interactive={false}` si ya vive dentro de otro botón.
