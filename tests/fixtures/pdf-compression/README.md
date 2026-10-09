Ces trois petits PDF ont été produits avec Reportlab 5.0.1, Helvetica et `invariant=1`. Texte :

```
Le rein filtre le plasma sanguin et regule les electrolytes.
Le coeur est situe dans le mediastin thoracique.
```

Paramètres de génération (`reportlab.rl_config.useA85` et `canvas.Canvas(..., pageCompression=...)`) :

| Fixture | useA85 | pageCompression |
| --- | ---: | ---: |
| reportlab-a85-flate.pdf | 1 | 1 |
| reportlab-flate.pdf | 0 | 1 |
| reportlab-raw.pdf | 0 | 0 |

Un TextObject à (72,740) écrit les deux lignes avec textLine, puis drawText/save. Les tests ne nécessitent ni Python ni Reportlab.
