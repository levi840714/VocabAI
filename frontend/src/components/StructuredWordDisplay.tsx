import React from 'react';
import { StructuredAIResponse } from '../lib/types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface StructuredWordDisplayProps {
  data: StructuredAIResponse;
}

const StructuredWordDisplay: React.FC<StructuredWordDisplayProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      {/* Word and Pronunciations */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800">
          {data.word}
        </h2>
        {data.pronunciations.length > 0 && (
          <div className="mt-2">
            {data.pronunciations.map((pronunciation, index) => (
              <span key={index} className="text-lg text-slate-600 mr-4">
                {pronunciation}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Definitions by Part of Speech */}
      <div className="space-y-3">
        {data.definitions.map((definition, defIndex) => (
          <Card key={defIndex} className="p-4">
            <Badge variant="secondary" className="mb-3">
              {definition.part_of_speech}
            </Badge>
            <div className="space-y-2">
              {definition.meanings.map((meaning, meaningIndex) => (
                <div key={meaningIndex} className="border-l-4 border-blue-200 pl-3">
                  <p className="text-slate-800 font-medium">
                    {meaning.definition}
                  </p>
                  {meaning.context && (
                    <p className="text-sm text-slate-600 mt-1">
                      {meaning.context}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Examples */}
      {data.examples.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            📝 例句
          </h3>
          <div className="space-y-2">
            {data.examples.map((example, index) => (
              <div key={index} className="bg-slate-50 p-3 rounded-lg">
                <p className="text-slate-700 italic">
                  "{example}"
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Synonyms and Antonyms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.synonyms.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              🔄 同義詞
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.synonyms.map((synonym, index) => (
                <Badge key={index} variant="outline" className="text-green-700 border-green-300">
                  {synonym}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {data.antonyms.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              ↔️ 反義詞
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.antonyms.map((antonym, index) => (
                <Badge key={index} variant="outline" className="text-red-700 border-red-300">
                  {antonym}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Memory Tips */}
      {data.memory_tips && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
            💡 記憶小技巧
          </h3>
          <p className="text-slate-700">
            {data.memory_tips}
          </p>
        </Card>
      )}
    </div>
  );
};

export default StructuredWordDisplay;