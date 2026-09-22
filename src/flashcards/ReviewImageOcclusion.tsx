import React, {useState} from 'react'
import type {Flashcard} from './flashcardsTypes'
import {getFlashcardAssetUrl} from './flashcardsApi'
import {CheckCircle2, Eye, EyeOff} from 'lucide-react'

interface ReviewImageOcclusionProps {
  card: Flashcard
  isFlipped: boolean
}

export const ReviewImageOcclusion: React.FC<ReviewImageOcclusionProps> = ({card, isFlipped}) => {
  const visual = card.visual
  const assetId = visual?.assetId
  const targetRect = visual?.targetRect

  const [imageLoaded, setImageLoaded] = useState(false)

  if (!assetId || !targetRect) {
    return (
      <div className="p-4 text-center text-red-400 bg-red-950/30 rounded-lg border border-red-800">
        Données d’occlusion visuelle incomplètes.
      </div>
    )
  }

  const imageUrl = getFlashcardAssetUrl(assetId)

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto select-none">
      {/* Visual Container */}
      <div className="relative inline-block border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl bg-black/40 max-w-full">
        <img
          src={imageUrl}
          alt={card.front || 'Image occlusion'}
          onLoad={() => setImageLoaded(true)}
          className="block max-h-[50vh] w-auto h-auto object-contain"
          draggable={false}
        />

        {/* Hide-One Target Mask Overlay */}
        {imageLoaded && (
          <div
            className={`absolute transition-all duration-300 rounded ${
              isFlipped
                ? 'border-2 border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20 animate-pulse'
                : 'border-2 border-amber-400 bg-amber-500 shadow-md flex items-center justify-center'
            }`}
            style={{
              left: `${targetRect.x * 100}%`,
              top: `${targetRect.y * 100}%`,
              width: `${targetRect.width * 100}%`,
              height: `${targetRect.height * 100}%`,
            }}
          >
            {isFlipped ? (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3" />
                Révélé
              </span>
            ) : (
              <span className="text-slate-900 font-extrabold text-sm drop-shadow">
                ?
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status indicator bar under the image */}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        {isFlipped ? (
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <Eye className="w-3.5 h-3.5" /> Zone révélée
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-300 font-medium">
            <EyeOff className="w-3.5 h-3.5" /> Masque actif (identifier la zone masquée)
          </span>
        )}
      </div>
    </div>
  )
}
